import type { IChat } from "../models/chatModel";
import type { IMessage } from "../models/messageModel";
import type { CreateMessageData, MessageListRecord, PopulatedChatRecord } from "../contracts/repository/chatRecords";

export interface IChatRepository {
  findById(chatId: string): Promise<PopulatedChatRecord | null>;
  createChat(userId: string, proId: string): Promise<IChat>;
  findChatByParticipants(userId: string, proId: string): Promise<PopulatedChatRecord | null>;
  findChatsByUser(userId: string): Promise<PopulatedChatRecord[]>;
  findChatsByPro(proId: string): Promise<PopulatedChatRecord[]>;
  createMessage(data: CreateMessageData): Promise<IMessage>;
  findMessagesByChatId(chatId: string, page: number, limit: number): Promise<MessageListRecord>;
  hasUserMessage(chatId: string): Promise<boolean>;
  updateChatLastMessage(chatId: string, message: IMessage): Promise<IChat | null>;
  updateUnreadCount(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro", increment: boolean): Promise<IChat | null>;
  markMessagesAsRead(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void>;
  markMessagesAsDelivered(chatId: string, participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void>;
}
