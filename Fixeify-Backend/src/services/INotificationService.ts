import { NotificationResponse, CreateNotificationRequest } from "../dtos/response/notificationDtos";

export interface INotificationService {
  createNotification(data: CreateNotificationRequest): Promise<NotificationResponse>;
  getNotifications(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin", page: number, limit: number, filter?: 'all' | 'unread'): Promise<{ notifications: NotificationResponse[]; total: number }>;
  getMessageNotifications(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin", page: number, limit: number, filter?: 'all' | 'unread'): Promise<{ notifications: NotificationResponse[]; total: number }>;
  getNonMessageNotifications(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin", page: number, limit: number, filter?: 'all' | 'unread'): Promise<{ notifications: NotificationResponse[]; total: number }>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin"): Promise<void>;
  markAllMessageNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin"): Promise<void>;
}