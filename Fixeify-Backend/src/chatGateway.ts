import { Server, type Socket } from "socket.io";
import { injectable, inject } from "inversify";
import type { IChatService } from "./services/IChatService";
import type { INotificationService } from "./services/INotificationService";
import { TYPES } from "./types";
import type { MessageResponse } from "./dtos/response/chatDtos";
import mongoose from "mongoose";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Server as HttpServer } from "http";
import { MESSAGES } from "./constants/messages";

declare const process: {
  env: {
    FRONTEND_URL: string;
    ACCESS_TOKEN_SECRET: string;
    [key: string]: string | undefined;
  };
};

declare const global: {
  io: Server;
  connectedUsers: Map<string, { socketId: string; userId: string; userRole: string }>;
  [key: string]: unknown;
};

export interface SocketMessage {
  chatId: string;
  senderId: string;
  senderModel: "User" | "ApprovedPro";
  body?: string;
  attachments?: { url: string; mime: string; size: number }[];
  role: string;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: "user" | "pro" | "admin";
  userModel?: "User" | "ApprovedPro" | "Admin";
}

@injectable()
export class ChatGateway {
  private _io!: Server;
  private _connectedUsers: Map<string, { socketId: string; userId: string; userRole: string }> = new Map();

  constructor(
    @inject(TYPES.IChatService) private chatService: IChatService,
    @inject(TYPES.INotificationService) private notificationService: INotificationService
  ) { }

  public init(server: HttpServer): void {
    this._io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    global.io = this._io;
    global.connectedUsers = this._connectedUsers;

    this._io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error(MESSAGES.NO_TOKEN_PROVIDED);
        }

        const secret = process.env.ACCESS_TOKEN_SECRET;
        if (!secret) {
          throw new Error(MESSAGES.ACCESS_TOKEN_SECRET_NOT_CONFIGURED);
        }
        const decoded = jwt.verify(token, secret) as JwtPayload;
        socket.userId = decoded.userId;

        const user = await mongoose.model("User").findById(decoded.userId, "role").exec();
        const pro = await mongoose.model("ApprovedPro").findById(decoded.userId, "role").exec();
        const admin = await mongoose.model("Admin").findById(decoded.userId, "role").exec();

        if (user) {
          socket.userRole = "user";
          socket.userModel = "User";
        } else if (pro) {
          socket.userRole = "pro";
          socket.userModel = "ApprovedPro";
        } else if (admin) {
          socket.userRole = "admin";
          socket.userModel = "Admin";
        } else {
          throw new Error(MESSAGES.USER_NOT_FOUND);
        }

        this._connectedUsers.set(decoded.userId, {
          socketId: socket.id,
          userId: decoded.userId,
          userRole: socket.userRole,
        });

        global.connectedUsers = this._connectedUsers;

        next();
      } catch {
        next(new Error(MESSAGES.AUTHENTICATION_FAILED));
      }
    });

    this._io.on("connection", (socket: AuthenticatedSocket) => {

      if (socket.userId && socket.userRole) {
        this._connectedUsers.set(socket.userId, {
          socketId: socket.id,
          userId: socket.userId,
          userRole: socket.userRole
        });
        global.connectedUsers = this._connectedUsers;

        const onlineUserIds = Array.from(this._connectedUsers.keys());
        for (const userId of onlineUserIds) {
          socket.emit("onlineStatus", { userId, isOnline: true });
        }

        this._io.emit("onlineStatus", { userId: socket.userId, isOnline: true });
      }

      socket.on("joinChat", async ({ chatId, participantId, participantModel }: { chatId: string; participantId: string; participantModel: "User" | "ApprovedPro" }) => {
        try {
          if (socket.userId !== participantId) {
            throw new Error(MESSAGES.UNAUTHORIZED_OWN_CHAT_JOIN);
          }

          if (!chatId || !participantId || !mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
            throw new Error(MESSAGES.INVALID_CHAT_OR_PARTICIPANT);
          }

          const chat = await this.chatService.findById(chatId);
          if (!chat) {
            throw new Error(MESSAGES.CHAT_NOT_FOUND);
          }

          const isParticipant = chat.participants.userId === participantId || chat.participants.proId === participantId;
          if (!isParticipant) {
            throw new Error(MESSAGES.USER_NOT_PARTICIPANT_IN_CHAT);
          }

          socket.join(chatId);

          await this.chatService.markMessagesAsDelivered(chatId, participantId, participantModel);

          this._io.to(chatId).emit("messagesDelivered", {
            chatId,
            participantId,
            participantModel
          });

          this._io.to(chatId).emit("userJoined", {
            chatId,
            participantId,
            participantModel,
            timestamp: new Date().toISOString()
          });

          const otherParticipantId = chat.participants.userId === participantId ? chat.participants.proId : chat.participants.userId;
          const isOtherOnline = this._connectedUsers.has(otherParticipantId);
          socket.emit("onlineStatus", { userId: otherParticipantId, isOnline: isOtherOnline });

        } catch (error) {
          socket.emit("error", { message: MESSAGES.FAILED_TO_JOIN_CHAT, error: (error as Error).message });
        }
      });

      socket.on("leaveChat", ({ chatId }: { chatId: string }) => {
        socket.leave(chatId);
        this._io.to(chatId).emit("userLeft", {
          chatId,
          participantId: socket.userId,
          timestamp: new Date().toISOString()
        });
      });

      socket.on("typing", ({ chatId }: { chatId: string }) => {
        socket.to(chatId).emit("typing", {
          chatId,
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });
      });

      socket.on("stopTyping", ({ chatId }: { chatId: string }) => {
        socket.to(chatId).emit("stopTyping", {
          chatId,
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });
      });

      socket.on("sendMessage", async (data: SocketMessage) => {
        try {
          if (socket.userId !== data.senderId) {
            throw new Error(MESSAGES.UNAUTHORIZED_SEND_MESSAGES_AS_SELF);
          }

          if (!data.chatId || !data.senderId || !mongoose.Types.ObjectId.isValid(data.chatId) || !mongoose.Types.ObjectId.isValid(data.senderId)) {
            throw new Error(MESSAGES.INVALID_CHAT_OR_SENDER);
          }

          if (!data.role || !["user", "pro"].includes(data.role)) {
            throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
          }

          const senderModel = data.role === "pro" ? "ApprovedPro" : "User";
          if ((senderModel === "User" && data.role !== "user") || (senderModel === "ApprovedPro" && data.role !== "pro")) {
            throw new Error(MESSAGES.ROLE_MISMATCH_PARTICIPANT_MODEL);
          }

          const message: MessageResponse = await this.chatService.sendMessage({ ...data, senderModel });

          this._io.to(data.chatId).emit("newMessage", message);

          const chat = await this.chatService.findById(data.chatId);
          if (chat) {
            const userChat = await this.chatService.getChatForParticipant(data.chatId, chat.participants.userId, "User");
            const proChat = await this.chatService.getChatForParticipant(data.chatId, chat.participants.proId, "ApprovedPro");
            
            const userConnection = this._connectedUsers.get(chat.participants.userId);
            const proConnection = this._connectedUsers.get(chat.participants.proId);
            
            if (userConnection && userChat) {
              this._io.to(userConnection.socketId).emit("conversationUpdated", userChat);
            }
            if (proConnection && proChat) {
              this._io.to(proConnection.socketId).emit("conversationUpdated", proChat);
            }
          }

        } catch (error) {
          socket.emit("error", { message: MESSAGES.FAILED_TO_SEND_MESSAGE, error: (error as Error).message });
        }
      });


      socket.on("markMessageRead", async ({ chatId, messageId }: { chatId: string; messageId?: string }) => {
        try {
          if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            throw new Error(MESSAGES.INVALID_CHATID);
          }

          const participantModel = socket.userRole === "pro" ? "ApprovedPro" : "User";
          await this.chatService.markMessagesAsRead(chatId, socket.userId!, participantModel);


          this._io.to(chatId).emit("messagesRead", {
            chatId,
            participantId: socket.userId,
            participantModel,
            messageId
          });

          const chat = await this.chatService.findById(chatId);
          if (chat) {
            const userChat = await this.chatService.getChatForParticipant(chatId, chat.participants.userId, "User");
            const proChat = await this.chatService.getChatForParticipant(chatId, chat.participants.proId, "ApprovedPro");
            
            const userConnection = this._connectedUsers.get(chat.participants.userId);
            const proConnection = this._connectedUsers.get(chat.participants.proId);
            
            if (userConnection && userChat) {
              this._io.to(userConnection.socketId).emit("conversationUpdated", userChat);
            }
            if (proConnection && proChat) {
              this._io.to(proConnection.socketId).emit("conversationUpdated", proChat);
            }
          }

        } catch (error) {
          socket.emit("error", { message: MESSAGES.FAILED_TO_MARK_MESSAGE_AS_READ, error: (error as Error).message });
        }
      });

      socket.on("disconnect", () => {

        if (socket.userId) {
          this._io.emit("onlineStatus", { userId: socket.userId, isOnline: false });
          this._connectedUsers.delete(socket.userId);
          global.connectedUsers = this._connectedUsers;
        }
      });
    });
  }

  public getConnectedUsers(): Map<string, { socketId: string; userId: string; userRole: string }> {
    return this._connectedUsers;
  }

  public emitToUser(userId: string, event: string, data: unknown): void {
    const user = this._connectedUsers.get(userId);
    if (user) {
      this._io.to(user.socketId).emit(event, data);
    }
  }
}
