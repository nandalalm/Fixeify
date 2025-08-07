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
    const response = {
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

    // Emit real-time notification to recipient using global io instance
    const recipientId = response.userId || response.proId;
    const receiverModel = response.userId ? 'User' : 'ApprovedPro';
    if (recipientId && (global as any).io) {
      const io = (global as any).io;
      // Find the connected user's socket and emit to them
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
    participantModel: "User" | "ApprovedPro",
    page: number,
    limit: number,
    filter: 'all' | 'unread' = 'all'
  ): Promise<{ notifications: NotificationResponse[]; total: number }> {
    if (!participantId) throw new Error("participantId is required");
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new Error("Invalid participantId");
    return participantModel === "User"
      ? this.notificationRepository.findNotificationsByUser(participantId, page, limit, filter)
      : this.notificationRepository.findNotificationsByPro(participantId, page, limit, filter);
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