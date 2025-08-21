import { Server, Socket } from "socket.io";
import { injectable, inject } from "inversify";
import { IChatService } from "./services/IChatService";
import { INotificationService } from "./services/INotificationService";
import { TYPES } from "./types";
import { MessageResponse } from "./dtos/response/chatDtos";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";

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
  private io!: Server;
  private connectedUsers: Map<string, { socketId: string; userId: string; userRole: string }> = new Map();

  constructor(
    @inject(TYPES.IChatService) private chatService: IChatService,
    @inject(TYPES.INotificationService) private notificationService: INotificationService
  ) {}

  public init(server: any): void {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    (global as any).io = this.io;
    (global as any).connectedUsers = this.connectedUsers;

    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          console.error("No token provided for socket authentication");
          throw new Error("No token provided");
        }

        const secret = process.env.ACCESS_TOKEN_SECRET;
        if (!secret) {
          console.error("ACCESS_TOKEN_SECRET is not defined in environment variables");
          throw new Error("Server configuration error: ACCESS_TOKEN_SECRET not set");
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
          throw new Error("User not found");
        }

        this.connectedUsers.set(decoded.userId, {
          socketId: socket.id,
          userId: decoded.userId,
          userRole: socket.userRole,
        });

        (global as any).connectedUsers = this.connectedUsers;

        next();
      } catch (error) {
        next(new Error("Authentication failed"));
      }
    });

    this.io.on("connection", (socket: AuthenticatedSocket) => {
      
      if (socket.userId && socket.userRole) {
        this.connectedUsers.set(socket.userId, {
          socketId: socket.id,
          userId: socket.userId,
          userRole: socket.userRole
        });
        (global as any).connectedUsers = this.connectedUsers;
        
   
        const onlineUserIds = Array.from(this.connectedUsers.keys());
        for (const userId of onlineUserIds) {
          socket.emit("onlineStatus", { userId, isOnline: true });
        }
        
      
        socket.broadcast.emit("onlineStatus", { userId: socket.userId, isOnline: true });
      }

      socket.on("joinChat", async ({ chatId, participantId, participantModel }: { chatId: string; participantId: string; participantModel: "User" | "ApprovedPro" }) => {
        try {
          if (socket.userId !== participantId) {
            throw new Error("Unauthorized: User can only join their own chats");
          }

          if (!chatId || !participantId || !mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
            throw new Error("Invalid chatId or participantId");
          }

          const chat = await this.chatService.findById(chatId);
          if (!chat) {
            throw new Error("Chat not found");
          }

          const isParticipant = chat.participants.userId === participantId || chat.participants.proId === participantId;
          if (!isParticipant) {
            throw new Error("User is not a participant in this chat");
          }

          socket.join(chatId);
          
        
          await this.chatService.markMessagesAsDelivered(chatId, participantId, participantModel);
          
      
          this.io.to(chatId).emit("messagesDelivered", { 
            chatId, 
            participantId,
            participantModel
          });
          
          this.io.to(chatId).emit("userJoined", { 
            chatId, 
            participantId, 
            participantModel,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          socket.emit("error", { message: "Failed to join chat", error: (error as Error).message });
        }
      });

      socket.on("leaveChat", ({ chatId }: { chatId: string }) => {
        socket.leave(chatId);
        this.io.to(chatId).emit("userLeft", { 
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
            throw new Error("Unauthorized: User can only send messages as themselves");
          }

          if (!data.chatId || !data.senderId || !mongoose.Types.ObjectId.isValid(data.chatId) || !mongoose.Types.ObjectId.isValid(data.senderId)) {
            throw new Error("Invalid chatId or senderId");
          }
          
          if (!data.role || !["user", "pro"].includes(data.role)) {
            throw new Error("Valid role is required");
          }
          
          const senderModel = data.role === "pro" ? "ApprovedPro" : "User";
          if ((senderModel === "User" && data.role !== "user") || (senderModel === "ApprovedPro" && data.role !== "pro")) {
            throw new Error("Role does not match expected participant model");
          }

          const message: MessageResponse = await this.chatService.sendMessage({ ...data, senderModel });
          
          this.io.to(data.chatId).emit("newMessage", message);

        } catch (error) {
          socket.emit("error", { message: "Failed to send message", error: (error as Error).message });
        }
      });

    
      socket.on("markMessageRead", async ({ chatId, messageId }: { chatId: string; messageId?: string }) => {
        try {
          if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            throw new Error("Invalid chatId");
          }

          const participantModel = socket.userRole === "pro" ? "ApprovedPro" : "User";
          await this.chatService.markMessagesAsRead(chatId, socket.userId!, participantModel);
          
       
          this.io.to(chatId).emit("messagesRead", { 
            chatId, 
            participantId: socket.userId,
            participantModel,
            messageId 
          });

    
          const chat = await this.chatService.findById(chatId);
          if (chat) {
            this.io.to(chatId).emit("conversationUpdated", chat);
          }

        } catch (error) {
          socket.emit("error", { message: "Failed to mark message as read", error: (error as Error).message });
        }
      });

      socket.on("disconnect", () => {

        if (socket.userId) {
          this.io.emit("onlineStatus", { userId: socket.userId, isOnline: false });
          this.connectedUsers.delete(socket.userId);
          (global as any).connectedUsers = this.connectedUsers;
        }
      });
    });
  }

  public getConnectedUsers(): Map<string, { socketId: string; userId: string; userRole: string }> {
    return this.connectedUsers;
  }

  public emitToUser(userId: string, event: string, data: any): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit(event, data);
    }
  }
}