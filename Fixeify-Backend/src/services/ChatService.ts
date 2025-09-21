import { injectable, inject } from "inversify";
import { IChatService,PopulatedUser,PopulatedPro,PopulatedChat } from "./IChatService";
import { IChatRepository } from "../repositories/IChatRepository";
import { INotificationService } from "./INotificationService";
import { ChatResponse, MessageResponse, CreateChatRequest, SendMessageRequest } from "../dtos/response/chatDtos";
import { TYPES } from "../types";
import mongoose from "mongoose";
import { IMessage } from "../models/messageModel";
import { HttpError } from "../middleware/errorMiddleware";
import { HttpStatus } from "../enums/httpStatus";
import { MESSAGES } from "../constants/messages";

@injectable()
export class ChatService implements IChatService {
  constructor(
    @inject(TYPES.IChatRepository) private _chatRepository: IChatRepository,
    @inject(TYPES.INotificationService) private _notificationService: INotificationService
  ) {}

  async getExistingChat(userId: string, proId: string, participantModel: "User" | "ApprovedPro"): Promise<ChatResponse | null> {
    if (!userId || !proId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.USERID_AND_PROID_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(proId)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    }
    const chat = await this._chatRepository.findChatByParticipants(userId, proId);
    if (!chat) {
      return null;
    }
    const user = await mongoose.model("User").findById(chat.participants.userId._id, "name photo").exec();
    const pro = await mongoose.model("ApprovedPro").findById(chat.participants.proId._id, "firstName lastName profilePhoto").exec();
    if (!user || !pro) {
      throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.NOT_FOUND);
    }
    const response = this.mapToChatResponse(chat, participantModel === "User" ? userId : proId, participantModel, {
      userName: user.name,
      userPhoto: user.photo || null,
      proName: `${pro.firstName} ${pro.lastName || ""}`.trim(),
      proPhoto: pro.profilePhoto || null,
    });
    return response;
  }

  async createChat(data: CreateChatRequest): Promise<ChatResponse> {
    if (!data.userId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.USERID_REQUIRED);
    if (!data.proId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.PROID_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(data.userId) || !mongoose.Types.ObjectId.isValid(data.proId)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    }
    const user = await mongoose.model("User").findById(data.userId, "name photo").exec();
    const pro = await mongoose.model("ApprovedPro").findById(data.proId, "firstName lastName profilePhoto").exec();
    if (!user) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
    if (!pro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

    let chat: PopulatedChat | null = await this._chatRepository.findChatByParticipants(data.userId, data.proId);
    if (chat) {
      return this.mapToChatResponse(chat, data.userId, data.role === "user" ? "User" : "ApprovedPro", {
        userName: user.name,
        userPhoto: user.photo || null,
        proName: `${pro.firstName} ${pro.lastName || ""}`.trim(),
        proPhoto: pro.profilePhoto || null,
      });
    }

    try {
      const newChat = await this._chatRepository.createChat(data.userId, data.proId);
      chat = await this._chatRepository.findChatByParticipants(data.userId, data.proId);
      if (!chat) {
        throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.FAILED_TO_FETCH_CHAT);
      }

      return this.mapToChatResponse(chat, data.userId, data.role === "user" ? "User" : "ApprovedPro", {
        userName: user.name,
        userPhoto: user.photo || null,
        proName: `${pro.firstName} ${pro.lastName || ""}`.trim(),
        proPhoto: pro.profilePhoto || null,
      });
    } catch (error: any) {
      if (error.code === 11000 && error.message.includes('participants.userId')) {
        chat = await this._chatRepository.findChatByParticipants(data.userId, data.proId);
        if (chat) {
          return this.mapToChatResponse(chat, data.userId, data.role === "user" ? "User" : "ApprovedPro", {
            userName: user.name,
            userPhoto: user.photo || null,
            proName: `${pro.firstName} ${pro.lastName || ""}`.trim(),
            proPhoto: pro.profilePhoto || null,
          });
        }
      }
      throw error; 
    }
  }

  async getChats(participantId: string, participantModel: "User" | "ApprovedPro"): Promise<ChatResponse[]> {
    if (!participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    const chats = await (participantModel === "User"
      ? this._chatRepository.findChatsByUser(participantId)
      : this._chatRepository.findChatsByPro(participantId));
    return Promise.all(
      chats.map(async (chat) => {
        const user = await mongoose.model("User").findById(chat.participants.userId._id, "name photo").exec();
        const pro = await mongoose.model("ApprovedPro").findById(chat.participants.proId._id, "firstName lastName profilePhoto").exec();
        return this.mapToChatResponse(chat, participantId, participantModel, {
          userName: user?.name || "Unknown User",
          userPhoto: user?.photo || null,
          proName: pro ? `${pro.firstName} ${pro.lastName || ""}`.trim() : "Unknown Pro",
          proPhoto: pro?.profilePhoto || null,
        });
      })
    );
  }

  async sendMessage(data: SendMessageRequest): Promise<MessageResponse> {
    if (!data.chatId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.CHATID_REQUIRED);
    if (!data.senderId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(data.chatId) || !mongoose.Types.ObjectId.isValid(data.senderId)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    }
    if (!data.body && (!data.attachments || data.attachments.length === 0)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.MESSAGE_BODY_OR_ATTACHMENTS_REQUIRED);
    }

    const chat = await this._chatRepository.findById(data.chatId);
    if (!chat) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CHAT_NOT_FOUND);

    const userId = chat.participants.userId._id.toString();
    const proId = chat.participants.proId._id.toString();
    
    if (![userId, proId].includes(data.senderId)) {
      throw new HttpError(HttpStatus.FORBIDDEN, MESSAGES.SENDER_NOT_AUTHORIZED_IN_CHAT);
    }

    if (data.senderModel === "ApprovedPro") {
      const userMessages = await mongoose.model("Message").findOne({
        chatId: new mongoose.Types.ObjectId(data.chatId),
        senderModel: "User",
      }).exec();
      if (!userMessages) {
        throw new HttpError(HttpStatus.FORBIDDEN, MESSAGES.SENDER_NOT_AUTHORIZED_IN_CHAT);
      }
    }

    const receiverId = data.senderId === userId ? proId : userId;
    const receiverModel = data.senderModel === "User" ? "ApprovedPro" : "User";

    const messageData: Partial<IMessage> = {
      chatId: new mongoose.Types.ObjectId(data.chatId),
      senderId: new mongoose.Types.ObjectId(data.senderId),
      senderModel: data.senderModel,
      receiverId: new mongoose.Types.ObjectId(receiverId),
      receiverModel,
      body: data.body,
      attachments: data.attachments,
      type: data.type || "text",
      isRead: false,
      status: "sent",
    };

    const message = await this._chatRepository.createMessage(messageData);
    await this._chatRepository.updateChatLastMessage(data.chatId, message);
    await this._chatRepository.updateUnreadCount(data.chatId, receiverId, receiverModel, true);

    const receiver = await (receiverModel === "User"
      ? mongoose.model("User").findById(receiverId, "name").exec()
      : mongoose.model("ApprovedPro").findById(receiverId, "firstName lastName").exec());
    if (!receiver) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.NOT_FOUND);

    const sender = await (data.senderModel === "User"
      ? mongoose.model("User").findById(data.senderId, "name").exec()
      : mongoose.model("ApprovedPro").findById(data.senderId, "firstName lastName").exec());
    if (!sender) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.NOT_FOUND);

    const senderName =
      data.senderModel === "User"
        ? (sender as PopulatedUser).name
        : `${(sender as PopulatedPro).firstName} ${(sender as PopulatedPro).lastName || ""}`.trim();

    let description: string;
    if (data.body && data.body.trim()) {
      description = data.body.slice(0, 100);
    } else if (data.attachments && data.attachments.length > 0) {
      description = "📷 Image";
    } else {
      description = "New message";
    }

    const notification = await this._notificationService.createNotification({
      userId: receiverModel === "User" ? receiverId : undefined,
      proId: receiverModel === "ApprovedPro" ? receiverId : undefined,
      title: `New message from ${senderName}`,
      description,
      type: "message",
      chatId: data.chatId,
      messageId: message._id.toString(),
    });

    const globalIo = (global as any).io;
    if (globalIo) {
      globalIo.emit("newNotification", { receiverId, receiverModel });
    }

    return this.mapToMessageResponse(message);
  }

  async getMessages(
    chatId: string,
    participantId: string,
    participantModel: "User" | "ApprovedPro",
    page: number,
    limit: number
  ): Promise<{ messages: MessageResponse[]; total: number }> {
    if (!chatId || !participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    }

    const chat = await this._chatRepository.findById(chatId);
    if (!chat) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CHAT_NOT_FOUND);

    const userId = chat.participants.userId._id.toString();
    const proId = chat.participants.proId._id.toString();
    if (![userId, proId].includes(participantId)) {
      throw new HttpError(HttpStatus.FORBIDDEN, MESSAGES.UNAUTHORIZED_OWN_CHATS);
    }

    const result = await this._chatRepository.findMessagesByChatId(chatId, page, limit);
    return result;
  }

  async markMessagesAsRead(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void> {
    if (!chatId || !participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    }

    const chat = await this._chatRepository.findById(chatId);
    if (!chat) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CHAT_NOT_FOUND);

    const userId = chat.participants.userId._id.toString();
    const proId = chat.participants.proId._id.toString();
    if (![userId, proId].includes(participantId)) {
      throw new HttpError(HttpStatus.FORBIDDEN, MESSAGES.USER_NOT_AUTHORIZED_MARK_MESSAGES);
    }

    await this._chatRepository.markMessagesAsRead(chatId, participantId, participantModel);
  }

  async markMessagesAsDelivered(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void> {
    if (!chatId || !participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    }

    const chat = await this._chatRepository.findById(chatId);
    if (!chat) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CHAT_NOT_FOUND);

    const userId = chat.participants.userId._id.toString();
    const proId = chat.participants.proId._id.toString();
    if (![userId, proId].includes(participantId)) {
      throw new HttpError(HttpStatus.FORBIDDEN, MESSAGES.USER_NOT_AUTHORIZED_MARK_MESSAGES);
    }

    await this._chatRepository.markMessagesAsDelivered(chatId, participantId, participantModel);
  }

  async findById(chatId: string): Promise<ChatResponse | null> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    }
    const chat = await this._chatRepository.findById(chatId);
    if (!chat) {
      return null;
    }
    const user = await mongoose.model("User").findById(chat.participants.userId._id, "name photo").exec();
    const pro = await mongoose.model("ApprovedPro").findById(chat.participants.proId._id, "firstName lastName profilePhoto").exec();
    return this.mapToChatResponse(chat, chat.participants.userId._id.toString(), "User", {
      userName: user?.name || "Unknown User",
      userPhoto: user?.photo || null,
      proName: pro ? `${pro.firstName} ${pro.lastName || ""}`.trim() : "Unknown Pro",
      proPhoto: pro?.profilePhoto || null,
    });
  }

  async getChatForParticipant(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<ChatResponse | null> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    }
    const chat = await this._chatRepository.findById(chatId);
    if (!chat) {
      return null;
    }
    const user = await mongoose.model("User").findById(chat.participants.userId._id, "name photo").exec();
    const pro = await mongoose.model("ApprovedPro").findById(chat.participants.proId._id, "firstName lastName profilePhoto").exec();
    return this.mapToChatResponse(chat, participantId, participantModel, {
      userName: user?.name || "Unknown User",
      userPhoto: user?.photo || null,
      proName: pro ? `${pro.firstName} ${pro.lastName || ""}`.trim() : "Unknown Pro",
      proPhoto: pro?.profilePhoto || null,
    });
  }

  private mapToChatResponse(
    chat: PopulatedChat,
    participantId: string,
    participantModel: "User" | "ApprovedPro",
    names: { userName: string; userPhoto?: string | null; proName: string; proPhoto?: string | null }
  ): ChatResponse {
    const unread = chat.unreadCount?.find(
      (uc) => uc.participantId.toString() === participantId && uc.participantModel === participantModel
    );

    return {
      id: chat._id.toString(),
      participants: {
        userId: chat.participants.userId._id.toString(),
        userName: names.userName,
        userPhoto: names.userPhoto,
        proId: chat.participants.proId._id.toString(),
        proName: names.proName,
        proPhoto: names.proPhoto,
      },
      lastMessage: chat.lastMessage
        ? {
            id: chat.lastMessage._id.toString(),
            body: chat.lastMessage.body,
            content: chat.lastMessage.body,
            senderId: chat.lastMessage.senderId.toString(),
            senderModel: chat.lastMessage.senderModel,
            timestamp: chat.lastMessage.createdAt.toISOString(),
            status: chat.lastMessage.isRead ? "read" : chat.lastMessage.status,
          }
        : undefined,
      unreadCount: unread ? unread.count : 0,
      createdAt: chat.createdAt,
    };
  }

  private mapToMessageResponse(message: IMessage): MessageResponse {
    return {
      id: message._id.toString(),
      chatId: message.chatId.toString(),
      senderId: message.senderId.toString(),
      senderModel: message.senderModel,
      receiverId: message.receiverId.toString(),
      receiverModel: message.receiverModel,
      content: message.body,
      attachments: message.attachments,
      type: message.type,
      isRead: message.isRead,
      status: message.isRead ? "read" : message.status,
      timestamp: message.createdAt.toISOString(),
    };
  }
}