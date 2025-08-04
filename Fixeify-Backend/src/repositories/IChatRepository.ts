import { IChat } from "../models/chatModel";
import { IMessage } from "../models/messageModel";
import { MessageResponse } from "../dtos/response/chatDtos";
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

export interface IChatRepository {
  findById(chatId: string): Promise<PopulatedChat | null>;
  createChat(userId: string, proId: string): Promise<IChat>;
  findChatByParticipants(userId: string, proId: string): Promise<PopulatedChat | null>;
  findChatsByUser(userId: string): Promise<PopulatedChat[]>;
  findChatsByPro(proId: string): Promise<PopulatedChat[]>;
  createMessage(data: Partial<IMessage>): Promise<IMessage>;
  findMessagesByChatId(chatId: string, page: number, limit: number): Promise<{ messages: MessageResponse[]; total: number }>;
  updateChatLastMessage(chatId: string, message: IMessage): Promise<IChat | null>;
  updateUnreadCount(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro", increment: boolean): Promise<IChat | null>;
  markMessagesAsRead(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void>;
}