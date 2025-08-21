import { ChatResponse, MessageResponse, CreateChatRequest, SendMessageRequest } from "../dtos/response/chatDtos";

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