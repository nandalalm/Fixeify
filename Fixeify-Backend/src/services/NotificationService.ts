import { injectable, inject } from "inversify";
import { INotificationService } from "./INotificationService";
import { INotificationRepository } from "../repositories/INotificationRepository";
import { NotificationResponse, CreateNotificationRequest } from "../dtos/response/notificationDtos";
import { TYPES } from "../types";
import mongoose from "mongoose";

@injectable()
export class NotificationService implements INotificationService {
  constructor(@inject(TYPES.INotificationRepository) private notificationRepository: INotificationRepository) {}

  async createNotification(data: CreateNotificationRequest): Promise<NotificationResponse> {
    if (!data.type || !data.title || !data.description) {
      throw new Error("type, title, and description are required");
    }
    const notification = await this.notificationRepository.createNotification(data);
    return {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      description: notification.description,
      userId: notification.userId?.toString(),
      proId: notification.proId?.toString(),
      chatId: notification.chatId?.toString(),
      bookingId: notification.bookingId?.toString(),
      quotaId: notification.quotaId?.toString(),
      walletId: notification.walletId?.toString(),
      messageId: notification.messageId?.toString(),
      isRead: notification.isRead,
      timestamp: notification.createdAt.toISOString(),
    };
  }

  async getNotifications(
    participantId: string,
    participantModel: "User" | "ApprovedPro",
    page: number,
    limit: number
  ): Promise<{ notifications: NotificationResponse[]; total: number }> {
    if (!participantId) throw new Error("participantId is required");
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new Error("Invalid participantId");
    return participantModel === "User"
      ? this.notificationRepository.findNotificationsByUser(participantId, page, limit)
      : this.notificationRepository.findNotificationsByPro(participantId, page, limit);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    if (!notificationId) throw new Error("notificationId is required");
    if (!mongoose.Types.ObjectId.isValid(notificationId)) throw new Error("Invalid notificationId");
    await this.notificationRepository.markNotificationAsRead(notificationId);
  }

  async markAllNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void> {
    if (!participantId) throw new Error("participantId is required");
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new Error("Invalid participantId");
    await this.notificationRepository.markAllNotificationsAsRead(participantId, participantModel);
  }
}