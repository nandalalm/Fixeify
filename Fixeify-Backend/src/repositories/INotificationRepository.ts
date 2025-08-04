import { INotification } from "../models/notificationModel";
import { NotificationResponse } from "../dtos/response/notificationDtos";

export interface INotificationRepository {
  createNotification(data: {
    type: "message" | "booking" | "quota" | "wallet" | "general";
    title: string;
    description: string;
    userId?: string;
    proId?: string;
    chatId?: string;
    bookingId?: string;
    quotaId?: string;
    walletId?: string;
    messageId?: string;
  }): Promise<INotification>;
  findNotificationsByUser(userId: string, page: number, limit: number): Promise<{ notifications: NotificationResponse[]; total: number }>;
  findNotificationsByPro(proId: string, page: number, limit: number): Promise<{ notifications: NotificationResponse[]; total: number }>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void>;
}