import { injectable, inject } from "inversify";
import { Request, Response } from "express";
import { IChatService } from "../services/IChatService";
import { CreateChatRequest, SendMessageRequest } from "../dtos/response/chatDtos";
import { TYPES } from "../types";
import { AuthRequest } from "../middleware/authMiddleware";
import { UserRole } from "../enums/roleEnum";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";

@injectable()
export class ChatController {
  constructor(@inject(TYPES.IChatService) private _chatService: IChatService) { }

  private isUserRole(role: unknown): role is UserRole {
    return typeof role === "string" && ["user", "pro"].includes(role as UserRole);
  }

  async getExistingChat(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { userId, proId, role } = req.params;

    try {
      const authUserId = authReq.userId;
      if (!authUserId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!userId || !proId) throw new Error(MESSAGES.USERID_AND_PROID_REQUIRED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      if (authUserId !== userId) {
        throw new Error(MESSAGES.UNAUTHORIZED_OWN_CHATS);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      const chat = await this._chatService.getExistingChat(userId, proId, participantModel);
      res.status(HttpStatus.OK).json({ chat });
    } catch (error) {
      console.error(MESSAGES.FAILED_TO_FETCH_CHAT, {
        error: (error as Error).message,
        userId,
        proId,
        role,
        authUserId: authReq.userId,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_FETCH_CHAT, error: (error as Error).message });
    }
  }

  async createChat(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { proId, role } = req.body as CreateChatRequest;
    const userId = authReq.userId;

    try {
      if (!userId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!proId) throw new Error(MESSAGES.PROID_REQUIRED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const senderModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      if ((senderModel === "User" && role !== UserRole.USER) || (senderModel === "ApprovedPro" && role !== UserRole.PRO)) {
        throw new Error(MESSAGES.ROLE_MISMATCH_PARTICIPANT_MODEL);
      }
      const chat = await this._chatService.createChat({ userId, proId, role });
      res.status(HttpStatus.CREATED).json(chat);
    } catch (error: any) {
      console.error(MESSAGES.FAILED_TO_CREATE_CHAT, {
        error: error.message,
        userId,
        proId,
        role,
        stack: error.stack,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_CREATE_CHAT, error: error.message });
    }
  }

  async getChats(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { role, userId } = req.params;

    try {
      const authUserId = authReq.userId;
      if (!authUserId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!userId) throw new Error(MESSAGES.USERID_REQUIRED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      if (authUserId !== userId) {
        throw new Error(MESSAGES.UNAUTHORIZED_OWN_CHATS);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      const chats = await this._chatService.getChats(authUserId, participantModel);
      res.status(HttpStatus.OK).json({ chats });
    } catch (error) {
      console.error(MESSAGES.FAILED_TO_FETCH_CHATS, {
        error: (error as Error).message,
        userId,
        role,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_FETCH_CHATS, error: (error as Error).message });
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { chatId, body, attachments, role, senderModel } = req.body as SendMessageRequest;
    const senderId = authReq.userId;

    try {
      if (!senderId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!chatId) throw new Error(MESSAGES.CHATID_REQUIRED);
      if (!body && (!attachments || attachments.length === 0)) throw new Error(MESSAGES.MESSAGE_BODY_OR_ATTACHMENTS_REQUIRED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      if (!senderModel || !["User", "ApprovedPro"].includes(senderModel)) {
        throw new Error(MESSAGES.INVALID_SENDER_MODEL);
      }
      if ((senderModel === "User" && role !== UserRole.USER) || (senderModel === "ApprovedPro" && role !== UserRole.PRO)) {
        throw new Error(MESSAGES.ROLE_MISMATCH_PARTICIPANT_MODEL);
      }
      const chat = await this._chatService.findById(chatId);
      if (!chat) throw new Error(MESSAGES.CHAT_NOT_FOUND);

      if (![chat.participants.userId, chat.participants.proId].includes(senderId)) {
        throw new Error(MESSAGES.SENDER_NOT_AUTHORIZED_IN_CHAT);
      }

      const message = await this._chatService.sendMessage({ chatId, senderId, senderModel, body, attachments, role });
      res.status(HttpStatus.CREATED).json(message);
    } catch (error) {
      console.error(MESSAGES.FAILED_TO_SEND_MESSAGE, {
        error: (error as Error).message,
        chatId,
        senderId,
        role,
        senderModel,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_SEND_MESSAGE, error: (error as Error).message });
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { chatId } = req.params;
    const { page = 1, limit = 20, role } = req.query;
    const participantId = authReq.userId;

    try {
      if (!participantId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!chatId) throw new Error(MESSAGES.CHATID_REQUIRED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      const result = await this._chatService.getMessages(chatId, participantId, participantModel, Number(page), Number(limit));
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error(MESSAGES.FAILED_TO_FETCH_MESSAGES, {
        error: (error as Error).message,
        chatId,
        participantId,
        role,
        stack: (error as Error).stack,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_FETCH_MESSAGES, error: (error as Error).message });
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
      if (!userId) throw new Error(MESSAGES.USERID_REQUIRED);
      if (!chatId) throw new Error(MESSAGES.CHATID_REQUIRED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      const chat = await this._chatService.findById(chatId);
      if (!chat) throw new Error(MESSAGES.CHAT_NOT_FOUND);

      if (![chat.participants.userId, chat.participants.proId].includes(userId)) {
        throw new Error(MESSAGES.USER_NOT_AUTHORIZED_MARK_MESSAGES);
      }

      await this._chatService.markMessagesAsRead(chatId, userId, participantModel);
      res.status(HttpStatus.OK).json({ message: MESSAGES.MESSAGES_MARKED_AS_READ });
    } catch (error) {
      console.error(MESSAGES.FAILED_TO_MARK_MESSAGES_AS_READ, {
        error: (error as Error).message,
        chatId,
        userId,
        role,
        stack: (error as Error).stack,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_MARK_MESSAGES_AS_READ, error: (error as Error).message });
    }
  }
}