import { injectable, inject } from "inversify";
import type { IChatService } from "./IChatService";
import type { IChatRepository } from "../repositories/IChatRepository";
import type { INotificationService } from "./INotificationService";
import type { CreateChatRequest, SendMessageRequest } from "../dtos/request/chatDtos";
import type { ChatResponse, MessageResponse } from "../dtos/response/chatDtos";
import { TYPES } from "../types";
import mongoose from "mongoose";
import { HttpError } from "../middleware/errorMiddleware";
import { HttpStatus } from "../enums/httpStatus";
import { MESSAGES } from "../constants/messages";
import { toChatResponse, toMessageResponse, toMessageResponses } from "../mappers/chatMapper";
import type { CreateMessageData, PopulatedChatRecord } from "../contracts/repository/chatRecords";

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
    return toChatResponse(chat, participantModel === "User" ? userId : proId, participantModel);
  }

  async createChat(data: CreateChatRequest): Promise<ChatResponse> {
    if (!data.userId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.USERID_REQUIRED);
    if (!data.proId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.PROID_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(data.userId) || !mongoose.Types.ObjectId.isValid(data.proId)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    }
    let chat: PopulatedChatRecord | null = await this._chatRepository.findChatByParticipants(data.userId, data.proId);
    if (chat) {
      return toChatResponse(chat, data.userId, data.role === "user" ? "User" : "ApprovedPro");
    }

    try {
      await this._chatRepository.createChat(data.userId, data.proId);
      chat = await this._chatRepository.findChatByParticipants(data.userId, data.proId);
      if (!chat) {
        throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.FAILED_TO_FETCH_CHAT);
      }

      return toChatResponse(chat, data.userId, data.role === "user" ? "User" : "ApprovedPro");
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && (error as { code: number; message: string }).code === 11000 && (error as { message: string }).message.includes('participants.userId')) {
        chat = await this._chatRepository.findChatByParticipants(data.userId, data.proId);
        if (chat) {
          return toChatResponse(chat, data.userId, data.role === "user" ? "User" : "ApprovedPro");
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
    return chats.map((chat) => toChatResponse(chat, participantId, participantModel));
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
      const hasUserMessage = await this._chatRepository.hasUserMessage(data.chatId);
      if (!hasUserMessage) {
        throw new HttpError(HttpStatus.FORBIDDEN, MESSAGES.SENDER_NOT_AUTHORIZED_IN_CHAT);
      }
    }

    const receiverId = data.senderId === userId ? proId : userId;
    const receiverModel = data.senderModel === "User" ? "ApprovedPro" : "User";

    const messageData: CreateMessageData = {
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

    const senderName =
      data.senderModel === "User"
        ? chat.participants.userId.name
        : `${chat.participants.proId.firstName} ${chat.participants.proId.lastName || ""}`.trim();

    let description: string;
    if (data.body && data.body.trim()) {
      description = data.body.slice(0, 100);
    } else if (data.attachments && data.attachments.length > 0) {
      description = MESSAGES.IMAGE_MESSAGE_DESCRIPTION;
    } else {
      description = MESSAGES.NEW_MESSAGE_DESCRIPTION;
    }

    await this._notificationService.createNotification({
      userId: receiverModel === "User" ? receiverId : undefined,
      proId: receiverModel === "ApprovedPro" ? receiverId : undefined,
      title: `${MESSAGES.NEW_MESSAGE_FROM_PREFIX} ${senderName}`,
      description,
      type: MESSAGES.NOTIFICATION_TYPE_MESSAGE,
      chatId: data.chatId,
      messageId: message._id.toString(),
    });

    const globalIo = (global as { io?: { emit: (event: string, data: Record<string, unknown>) => void } }).io;
    if (globalIo) {
      globalIo.emit("newNotification", { receiverId, receiverModel });
    }

    return toMessageResponse(message);
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
    return { messages: toMessageResponses(result.messages), total: result.total };
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
    return toChatResponse(chat, chat.participants.userId._id.toString(), "User");
  }

  async getChatForParticipant(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<ChatResponse | null> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    }
    const chat = await this._chatRepository.findById(chatId);
    if (!chat) {
      return null;
    }
    return toChatResponse(chat, participantId, participantModel);
  }
}
