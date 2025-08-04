import { injectable, inject } from "inversify";
import { Request, Response } from "express";
import { IChatService } from "../services/IChatService";
import { CreateChatRequest, SendMessageRequest, ChatResponse, MessageResponse } from "../dtos/response/chatDtos";
import { TYPES } from "../types";
import { AuthRequest } from "../middleware/authMiddleware";
import { UserRole } from "../enums/roleEnum";
import { MESSAGES } from "../constants/messages";

@injectable()
export class ChatController {
  constructor(@inject(TYPES.IChatService) private chatService: IChatService) {}

  private isUserRole(role: unknown): role is UserRole {
    return typeof role === "string" && ["user", "pro"].includes(role as UserRole);
  }

  async getExistingChat(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { userId, proId, role } = req.params;

    try {
      const authUserId = authReq.userId;
      if (!authUserId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!userId || !proId) throw new Error("userId and proId are required");
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      if (authUserId !== userId) {
        throw new Error("Unauthorized: Can only access own chats");
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      const chat = await this.chatService.getExistingChat(userId, proId, participantModel);
      res.status(200).json({ chat });
    } catch (error) {
      console.error("Error in getExistingChat:", {
        error: (error as Error).message,
        userId,
        proId,
        role,
        authUserId: authReq.userId,
      });
      res.status(500).json({ message: "Failed to fetch chat", error: (error as Error).message });
    }
  }

  async createChat(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { proId, role } = req.body as CreateChatRequest;
    const userId = authReq.userId;

    try {
      if (!userId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!proId) throw new Error("proId is required");
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const senderModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      if ((senderModel === "User" && role !== UserRole.USER) || (senderModel === "ApprovedPro" && role !== UserRole.PRO)) {
        throw new Error("Role does not match expected participant model");
      }
      const chat = await this.chatService.createChat({ userId, proId, role });
      res.status(201).json(chat);
    } catch (error: any) {
      console.error("Error in createChat:", {
        error: error.message,
        userId,
        proId,
        role,
        stack: error.stack,
      });
      res.status(500).json({ message: "Failed to create chat", error: error.message });
    }
  }

  async getChats(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { role, userId } = req.params;

    try {
      const authUserId = authReq.userId;
      if (!authUserId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!userId) throw new Error("userId is required");
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      if (authUserId !== userId) {
        throw new Error("Unauthorized: Can only access own chats");
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      const chats = await this.chatService.getChats(authUserId, participantModel);
      res.status(200).json({ chats });
    } catch (error) {
      console.error("Error in getChats:", {
        error: (error as Error).message,
        userId,
        role,
      });
      res.status(500).json({ message: "Failed to fetch chats", error: (error as Error).message });
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { chatId, body, attachments, role, senderModel } = req.body as SendMessageRequest;
    const senderId = authReq.userId;

    try {
      if (!senderId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!chatId) throw new Error("chatId is required");
      if (!body && (!attachments || attachments.length === 0)) throw new Error("Message body or attachments required");
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      if (!senderModel || !["User", "ApprovedPro"].includes(senderModel)) {
        throw new Error("Invalid senderModel");
      }
      if ((senderModel === "User" && role !== UserRole.USER) || (senderModel === "ApprovedPro" && role !== UserRole.PRO)) {
        throw new Error("Role does not match expected participant model");
      }
      const chat = await this.chatService.findById(chatId);
      if (!chat) throw new Error("Chat not found");

      if (![chat.participants.userId, chat.participants.proId].includes(senderId)) {
        throw new Error(`Sender not authorized to send message in this chat (chatId: ${chatId}, senderId: ${senderId})`);
      }

      const message = await this.chatService.sendMessage({ chatId, senderId, senderModel, body, attachments, role });
      res.status(201).json(message);
    } catch (error) {
      console.error("Error in sendMessage:", {
        error: (error as Error).message,
        chatId,
        senderId,
        role,
        senderModel,
      });
      res.status(500).json({ message: "Failed to send message", error: (error as Error).message });
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { chatId } = req.params;
    const { page = 1, limit = 20, role } = req.query;
    const participantId = authReq.userId;

    try {
      if (!participantId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!chatId) throw new Error("chatId is required");
      if (!role || !this.isUserRole(role)) {
        throw new Error("Valid role (user or pro) is required");
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      const result = await this.chatService.getMessages(chatId, participantId, participantModel, Number(page), Number(limit));
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getMessages:", {
        error: (error as Error).message,
        chatId,
        participantId,
        role,
        stack: (error as Error).stack,
      });
      res.status(500).json({ message: "Failed to fetch messages", error: (error as Error).message });
    }
  }

  async markMessagesAsRead(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { chatId } = req.params;
    const { userId } = req.body;
    const { role } = req.query;

    try {
      const authUserId = authReq.userId;
      if (!authUserId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!userId) throw new Error("userId is required");
      if (!chatId) throw new Error("chatId is required");
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      const chat = await this.chatService.findById(chatId);
      if (!chat) throw new Error("Chat not found");

      if (![chat.participants.userId, chat.participants.proId].includes(userId)) {
        throw new Error(`User not authorized to mark messages in this chat (chatId: ${chatId}, userId: ${userId})`);
      }

      await this.chatService.markMessagesAsRead(chatId, userId, participantModel);
      res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Error in markMessagesAsRead:", {
        error: (error as Error).message,
        chatId,
        userId,
        role,
        stack: (error as Error).stack,
      });
      res.status(500).json({ message: "Failed to mark messages as read", error: (error as Error).message });
    }
  }
}