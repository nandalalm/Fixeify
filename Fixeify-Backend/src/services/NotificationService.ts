import { injectable, inject } from "inversify";
import { INotificationService } from "./INotificationService";
import { INotificationRepository } from "../repositories/INotificationRepository";
import { NotificationResponse, CreateNotificationRequest } from "../dtos/response/notificationDtos";
import { TYPES } from "../types";
import mongoose from "mongoose";
import { HttpError } from "../middleware/errorMiddleware";
import { HttpStatus } from "../enums/httpStatus";
import { MESSAGES } from "../constants/messages";

@injectable()
export class NotificationService implements INotificationService {
  constructor(@inject(TYPES.INotificationRepository) private _notificationRepository: INotificationRepository) { }

  async createNotification(data: CreateNotificationRequest): Promise<NotificationResponse> {
    if (!data.type || !data.title || !data.description) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    }
    const notification = await this._notificationRepository.createNotification(data);
    const response = {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      description: notification.description,
      userId: notification.userId?.toString(),
      proId: notification.proId?.toString(),
      adminId: notification.adminId?.toString(),
      chatId: notification.chatId?.toString(),
      bookingId: notification.bookingId?.toString(),
      quotaId: notification.quotaId?.toString(),
      walletId: notification.walletId?.toString(),
      messageId: notification.messageId?.toString(),
      isRead: notification.isRead,
      timestamp: notification.createdAt.toISOString(),
    };

    const recipientId = response.userId || response.proId || response.adminId;
    const receiverModel = response.userId ? 'User' : response.proId ? 'ApprovedPro' : 'Admin';
    if (recipientId && (global as any).io) {
      const io = (global as any).io;
      const connectedUsers = (global as any).connectedUsers || new Map();
      const user = connectedUsers.get(recipientId);
      if (user) {
        io.to(user.socketId).emit("newNotification", {
          ...response,
          receiverId: recipientId,
          receiverModel
        });
      }
    }

    return response;
  }

  async getNotifications(
    participantId: string,
    participantModel: "User" | "ApprovedPro" | "Admin",
    page: number,
    limit: number,
    filter: 'all' | 'unread' = 'all'
  ): Promise<{ notifications: NotificationResponse[]; total: number }> {
    if (!participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    if (participantModel === "User") {
      return this._notificationRepository.findNotificationsByUser(participantId, page, limit, filter);
    } else if (participantModel === "ApprovedPro") {
      return this._notificationRepository.findNotificationsByPro(participantId, page, limit, filter);
    } else {
      return this._notificationRepository.findNotificationsByAdmin(participantId, page, limit, filter);
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    if (!notificationId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.NOTIFICATIONID_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(notificationId)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    await this._notificationRepository.markNotificationAsRead(notificationId);
  }

  async markAllNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin"): Promise<void> {
    if (!participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    await this._notificationRepository.markAllNotificationsAsRead(participantId, participantModel);
  }
}