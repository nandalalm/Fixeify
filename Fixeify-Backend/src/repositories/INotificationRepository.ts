import type { INotification } from "../models/notificationModel";
import type { CreateNotificationData, NotificationFilter, NotificationListRecord } from "../contracts/repository/notificationRecords";

export interface INotificationRepository {
  createNotification(data: CreateNotificationData): Promise<INotification>;
  findNotificationsByUser(userId: string, page: number, limit: number, filter?: NotificationFilter): Promise<NotificationListRecord>;
  findNotificationsByPro(proId: string, page: number, limit: number, filter?: NotificationFilter): Promise<NotificationListRecord>;
  findNotificationsByAdmin(adminId: string, page: number, limit: number, filter?: NotificationFilter): Promise<NotificationListRecord>;
  findMessageNotificationsByUser(userId: string, page: number, limit: number, filter?: NotificationFilter): Promise<NotificationListRecord>;
  findMessageNotificationsByPro(proId: string, page: number, limit: number, filter?: NotificationFilter): Promise<NotificationListRecord>;
  findMessageNotificationsByAdmin(adminId: string, page: number, limit: number, filter?: NotificationFilter): Promise<NotificationListRecord>;
  findNonMessageNotificationsByUser(userId: string, page: number, limit: number, filter?: NotificationFilter): Promise<NotificationListRecord>;
  findNonMessageNotificationsByPro(proId: string, page: number, limit: number, filter?: NotificationFilter): Promise<NotificationListRecord>;
  findNonMessageNotificationsByAdmin(adminId: string, page: number, limit: number, filter?: NotificationFilter): Promise<NotificationListRecord>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin"): Promise<void>;
  markAllMessageNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin"): Promise<void>;
  markChatMessageNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin", chatId: string): Promise<void>;
}
