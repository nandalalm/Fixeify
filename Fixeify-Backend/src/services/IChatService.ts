import { ChatResponse, MessageResponse, CreateChatRequest, SendMessageRequest } from "../dtos/response/chatDtos";
import { IChat } from "../models/chatModel";
import mongoose from "mongoose";
import { IMessage } from "../models/messageModel";

export interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
}

export interface PopulatedPro {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
}

export type PopulatedChat = Omit<IChat, "participants" | "lastMessage"> & {
  participants: {
    userId: PopulatedUser;
    proId: PopulatedPro;
  };
  lastMessage?: IMessage;
};

export interface IChatService {
  getExistingChat(userId: string, proId: string, participantModel: "User" | "ApprovedPro"): Promise<ChatResponse | null>;
  createChat(data: CreateChatRequest): Promise<ChatResponse>;
  getChats(participantId: string, participantModel: "User" | "ApprovedPro"): Promise<ChatResponse[]>;
  sendMessage(data: SendMessageRequest): Promise<MessageResponse>;
  getMessages(
    chatId: string,
    participantId: string,
    participantModel: "User" | "ApprovedPro",
    page: number,
    limit: number
  ): Promise<{ messages: MessageResponse[]; total: number }>;
  markMessagesAsRead(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void>;
  markMessagesAsDelivered(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void>;
  findById(chatId: string): Promise<ChatResponse | null>;
}