import { INotification } from "../models/notificationModel";
import { NotificationResponse } from "../dtos/response/notificationDtos";

export interface INotificationRepository {
  createNotification(data: {
    type: "message" | "booking" | "quota" | "wallet" | "general";
    title: string;
    description: string;
    userId?: string;
    proId?: string;
    adminId?: string;
    chatId?: string;
    bookingId?: string;
    quotaId?: string;
    walletId?: string;
    messageId?: string;
  }): Promise<INotification>;
  findNotificationsByUser(userId: string, page: number, limit: number, filter?: 'all' | 'unread'): Promise<{ notifications: NotificationResponse[]; total: number }>;
  findNotificationsByPro(proId: string, page: number, limit: number, filter?: 'all' | 'unread'): Promise<{ notifications: NotificationResponse[]; total: number }>;
  findNotificationsByAdmin(adminId: string, page: number, limit: number, filter?: 'all' | 'unread'): Promise<{ notifications: NotificationResponse[]; total: number }>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin"): Promise<void>;
}