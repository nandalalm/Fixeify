import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { IChat, Chat } from "../models/chatModel";
import { IMessage, MessageModel } from "../models/messageModel";
import { IChatRepository } from "./IChatRepository";
import {  MessageResponse } from "../dtos/response/chatDtos";
import mongoose from "mongoose";

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
}

interface PopulatedPro {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
}

type PopulatedChat = Omit<IChat, "participants" | "lastMessage"> & {
  participants: {
    userId: PopulatedUser;
    proId: PopulatedPro;
  };
  lastMessage?: IMessage;
};

@injectable()
export class MongoChatRepository extends BaseRepository<IChat, PopulatedChat> implements IChatRepository {
  constructor() {
    super(Chat);
  }

  async findById(chatId: string): Promise<PopulatedChat | null> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error("Invalid chatId");
    }
    return this._model
      .findById(chatId)
      .populate<{ participants: { userId: PopulatedUser; proId: PopulatedPro } }>({
        path: "participants.userId",
        select: "name",
        model: "User",
      })
      .populate<{ participants: { userId: PopulatedUser; proId: PopulatedPro } }>({
        path: "participants.proId",
        select: "firstName lastName",
        model: "ApprovedPro",
      })
      .populate<{ lastMessage?: IMessage }>({
        path: "lastMessage",
        select: "body senderId senderModel receiverId receiverModel type isRead status createdAt",
        model: "Message",
      })
      .lean()
      .exec() as Promise<PopulatedChat | null>;
  }

  async createChat(userId: string, proId: string): Promise<IChat> {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(proId)) {
      throw new Error("Invalid userId or proId");
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

  async findChatByParticipants(userId: string, proId: string): Promise<PopulatedChat | null> {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(proId)) {
      throw new Error("Invalid userId or proId");
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
      .populate<{ participants: { userId: PopulatedUser; proId: PopulatedPro } }>({
        path: "participants.userId",
        select: "name",
        model: "User",
      })
      .populate<{ participants: { userId: PopulatedUser; proId: PopulatedPro } }>({
        path: "participants.proId",
        select: "firstName lastName",
        model: "ApprovedPro",
      })
      .populate<{ lastMessage?: IMessage }>({
        path: "lastMessage",
        select: "body senderId senderModel receiverId receiverModel type isRead status createdAt",
        model: "Message",
      })
      .lean()
      .exec();
    return chat as PopulatedChat | null;
  }

  async findChatsByUser(userId: string): Promise<PopulatedChat[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }
    const chats = await this._model
      .find({ "participants.userId": new mongoose.Types.ObjectId(userId) })
      .populate<{ participants: { userId: PopulatedUser; proId: PopulatedPro } }>({
        path: "participants.userId",
        select: "name",
        model: "User",
      })
      .populate<{ participants: { userId: PopulatedUser; proId: PopulatedPro } }>({
        path: "participants.proId",
        select: "firstName lastName",
        model: "ApprovedPro",
      })
      .populate<{ lastMessage?: IMessage }>({
        path: "lastMessage",
        select: "body senderId senderModel receiverId receiverModel type isRead status createdAt",
        model: "Message",
      })
      .lean()
      .exec();
    return chats as PopulatedChat[];
  }

  async findChatsByPro(proId: string): Promise<PopulatedChat[]> {
    if (!mongoose.Types.ObjectId.isValid(proId)) {
      throw new Error("Invalid proId");
    }
    const chats = await this._model
      .find({ "participants.proId": new mongoose.Types.ObjectId(proId) })
      .populate<{ participants: { userId: PopulatedUser; proId: PopulatedPro } }>({
        path: "participants.userId",
        select: "name",
        model: "User",
      })
      .populate<{ participants: { userId: PopulatedUser; proId: PopulatedPro } }>({
        path: "participants.proId",
        select: "firstName lastName",
        model: "ApprovedPro",
      })
      .populate<{ lastMessage?: IMessage }>({
        path: "lastMessage",
        select: "body senderId senderModel receiverId receiverModel type isRead status createdAt",
        model: "Message",
      })
      .lean()
      .exec();
    return chats as PopulatedChat[];
  }

  async createMessage(data: Partial<IMessage>): Promise<IMessage> {
    if (!data.chatId || !data.senderId || !mongoose.Types.ObjectId.isValid(data.chatId) || !mongoose.Types.ObjectId.isValid(data.senderId)) {
      throw new Error("Invalid chatId or senderId");
    }
    return MessageModel.create(data);
  }

  async findMessagesByChatId(chatId: string, page: number, limit: number): Promise<{ messages: MessageResponse[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
    
      const messages = await MessageModel
        .find({ chatId })
        .sort([["createdAt", -1]])
        .skip(skip)
        .limit(limit)
        .exec();

      const total = await MessageModel.countDocuments({ chatId });

      return {
        messages: messages.map((msg) => ({
          id: msg._id.toString(),
          chatId: msg.chatId.toString(),
          senderId: msg.senderId.toString(),
          senderModel: msg.senderModel,
          receiverId: msg.receiverId.toString(),
          receiverModel: msg.receiverModel,
          content: msg.body,
          timestamp: msg.createdAt.toISOString(),
          isRead: msg.isRead,
          attachments: msg.attachments || [],
          type: msg.type || "text",
          status: msg.isRead ? "read" : msg.status || "sent",
        })),
        total,
      };
    } catch (error) {
      console.error("Error finding messages by chatId:", error);
      throw error;
    }
  }

  async updateChatLastMessage(chatId: string, message: IMessage): Promise<IChat | null> {
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(message._id)) {
      throw new Error("Invalid chatId or messageId");
    }
    return this.updateById(chatId, {
      $set: { lastMessage: message._id, updatedAt: new Date() },
    });
  }

  async updateUnreadCount(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro", increment: boolean): Promise<IChat | null> {
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
      throw new Error("Invalid chatId or participantId");
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
      throw new Error("Invalid chatId or participantId");
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
          $set: { "unreadCount.$[elem].count": 0 },
        },
        {
          arrayFilters: [{ "elem.participantId": new mongoose.Types.ObjectId(participantId), "elem.participantModel": participantModel }],
        }
      )
      .exec();
  }

  async markMessagesAsDelivered(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
      throw new Error("Invalid chatId or participantId");
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