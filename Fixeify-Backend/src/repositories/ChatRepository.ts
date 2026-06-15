import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { type IChat, Chat } from "../models/chatModel";
import { type IMessage, MessageModel } from "../models/messageModel";
import logger from "../config/logger";
import type { IChatRepository } from "./IChatRepository";
import mongoose from "mongoose";
import { MESSAGES } from "../constants/messages";
import type { CreateMessageData, MessageListRecord, PopulatedChatProRecord, PopulatedChatRecord, PopulatedChatUserRecord } from "../contracts/repository/chatRecords";

@injectable()
export class MongoChatRepository extends BaseRepository<IChat, PopulatedChatRecord> implements IChatRepository {
  constructor() {
    super(Chat);
  }

  async findById(chatId: string): Promise<PopulatedChatRecord | null> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error(MESSAGES.CHATID_REQUIRED);
    }
    return this._model
      .findById(chatId)
      .populate<{ participants: { userId: PopulatedChatUserRecord; proId: PopulatedChatProRecord } }>({
        path: "participants.userId",
        select: "name photo",
        model: "User",
      })
      .populate<{ participants: { userId: PopulatedChatUserRecord; proId: PopulatedChatProRecord } }>({
        path: "participants.proId",
        select: "firstName lastName profilePhoto",
        model: "ApprovedPro",
      })
      .populate<{ lastMessage?: IMessage }>({
        path: "lastMessage",
        select: "body senderId senderModel receiverId receiverModel type isRead status createdAt",
        model: "Message",
      })
      .lean<PopulatedChatRecord>()
      .exec();
  }

  async createChat(userId: string, proId: string): Promise<IChat> {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(proId)) {
      throw new Error(MESSAGES.USERID_AND_PROID_REQUIRED);
    }
    return this.create({
      participants: {
        userId: new mongoose.Types.ObjectId(userId),
        proId: new mongoose.Types.ObjectId(proId),
      },
      unreadCount: [
        { participantId: new mongoose.Types.ObjectId(userId), participantModel: "User", count: 0 },
        { participantId: new mongoose.Types.ObjectId(proId), participantModel: "ApprovedPro", count: 0 },
      ],
    });
  }

  async findChatByParticipants(userId: string, proId: string): Promise<PopulatedChatRecord | null> {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(proId)) {
      throw new Error(MESSAGES.USERID_AND_PROID_REQUIRED);
    }
    const query = {
      $or: [
        {
          "participants.userId": new mongoose.Types.ObjectId(userId),
          "participants.proId": new mongoose.Types.ObjectId(proId),
        },
        {
          "participants.userId": new mongoose.Types.ObjectId(proId),
          "participants.proId": new mongoose.Types.ObjectId(userId),
        },
      ],
    };
    const chat = await this._model
      .findOne(query)
      .populate<{ participants: { userId: PopulatedChatUserRecord; proId: PopulatedChatProRecord } }>({
        path: "participants.userId",
        select: "name photo",
        model: "User",
      })
      .populate<{ participants: { userId: PopulatedChatUserRecord; proId: PopulatedChatProRecord } }>({
        path: "participants.proId",
        select: "firstName lastName profilePhoto",
        model: "ApprovedPro",
      })
      .populate<{ lastMessage?: IMessage }>({
        path: "lastMessage",
        select: "body senderId senderModel receiverId receiverModel type isRead status createdAt",
        model: "Message",
      })
      .lean<PopulatedChatRecord>()
      .exec();
    return chat;
  }

  async findChatsByUser(userId: string): Promise<PopulatedChatRecord[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error(MESSAGES.USERID_REQUIRED);
    }
    return this._model
      .find({ "participants.userId": new mongoose.Types.ObjectId(userId) })
      .populate<{ participants: { userId: PopulatedChatUserRecord; proId: PopulatedChatProRecord } }>({
        path: "participants.userId",
        select: "name photo",
        model: "User",
      })
      .populate<{ participants: { userId: PopulatedChatUserRecord; proId: PopulatedChatProRecord } }>({
        path: "participants.proId",
        select: "firstName lastName profilePhoto",
        model: "ApprovedPro",
      })
      .populate<{ lastMessage?: IMessage }>({
        path: "lastMessage",
        select: "body senderId senderModel receiverId receiverModel type isRead status createdAt",
        model: "Message",
      })
      .lean<PopulatedChatRecord[]>()
      .exec();
  }

  async findChatsByPro(proId: string): Promise<PopulatedChatRecord[]> {
    if (!mongoose.Types.ObjectId.isValid(proId)) {
      throw new Error(MESSAGES.PROID_REQUIRED);
    }
    return this._model
      .find({ "participants.proId": new mongoose.Types.ObjectId(proId) })
      .populate<{ participants: { userId: PopulatedChatUserRecord; proId: PopulatedChatProRecord } }>({
        path: "participants.userId",
        select: "name photo",
        model: "User",
      })
      .populate<{ participants: { userId: PopulatedChatUserRecord; proId: PopulatedChatProRecord } }>({
        path: "participants.proId",
        select: "firstName lastName profilePhoto",
        model: "ApprovedPro",
      })
      .populate<{ lastMessage?: IMessage }>({
        path: "lastMessage",
        select: "body senderId senderModel receiverId receiverModel type isRead status createdAt",
        model: "Message",
      })
      .lean<PopulatedChatRecord[]>()
      .exec();
  }

  async createMessage(data: CreateMessageData): Promise<IMessage> {
    if (!data.chatId || !data.senderId || !mongoose.Types.ObjectId.isValid(data.chatId) || !mongoose.Types.ObjectId.isValid(data.senderId)) {
      throw new Error(MESSAGES.CHATID_REQUIRED);
    }
    return MessageModel.create(data);
  }

  async findMessagesByChatId(chatId: string, page: number, limit: number): Promise<MessageListRecord> {
    try {
      const skip = (page - 1) * limit;
    
      const query = { chatId: new mongoose.Types.ObjectId(chatId) };
      const [messages, total] = await Promise.all([
        MessageModel
          .find(query)
          .sort([["createdAt", -1]])
          .skip(skip)
          .limit(limit)
          .exec(),
        MessageModel.countDocuments(query),
      ]);

      return { messages, total };
    } catch (error) {
      logger.error(MESSAGES.FAILED_TO_FETCH_MESSAGES, error);
      throw error;
    }
  }

  async hasUserMessage(chatId: string): Promise<boolean> {
    const message = await MessageModel.exists({
      chatId: new mongoose.Types.ObjectId(chatId),
      senderModel: "User",
    }).exec();
    return message !== null;
  }

  async updateChatLastMessage(chatId: string, message: IMessage): Promise<IChat | null> {
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(message._id)) {
      throw new Error(MESSAGES.CHATID_REQUIRED);
    }
    return this.updateById(chatId, {
      $set: { lastMessage: message._id, updatedAt: new Date() },
    });
  }

  async updateUnreadCount(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro", increment: boolean): Promise<IChat | null> {
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
      throw new Error(MESSAGES.CHATID_REQUIRED);
    }
    return this._model
      .findByIdAndUpdate(
        chatId,
        {
          $inc: { "unreadCount.$[elem].count": increment ? 1 : -1 },
        },
        {
          arrayFilters: [{ "elem.participantId": new mongoose.Types.ObjectId(participantId), "elem.participantModel": participantModel }],
          new: true,
        }
      )
      .exec();
  }

  async markMessagesAsRead(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
      throw new Error(MESSAGES.CHATID_REQUIRED);
    }
    await MessageModel.updateMany(
      {
        chatId: new mongoose.Types.ObjectId(chatId),
        receiverId: new mongoose.Types.ObjectId(participantId),
        receiverModel: participantModel,
        isRead: false,
      },
      { $set: { isRead: true, status: "read", updatedAt: new Date() } }
    ).exec();

    await this._model
      .findByIdAndUpdate(
        chatId,
        {
          $set: { "unreadCount.$[elem].count": 0, updatedAt: new Date() },
        },
        {
          arrayFilters: [{ "elem.participantId": new mongoose.Types.ObjectId(participantId), "elem.participantModel": participantModel }],
        }
      )
      .exec();
  }

  async markMessagesAsDelivered(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
      throw new Error(MESSAGES.CHATID_REQUIRED);
    }
   
    await MessageModel.updateMany(
      {
        chatId: new mongoose.Types.ObjectId(chatId),
        receiverId: new mongoose.Types.ObjectId(participantId),
        receiverModel: participantModel,
        status: "sent",
        isRead: false,
      },
      { $set: { status: "delivered", updatedAt: new Date() } }
    ).exec();
  }
}
