import type { INotification } from "../../models/notificationModel";

export type NotificationRecord = INotification;

export type NotificationType = "message" | "booking" | "quota" | "wallet" | "general";
export type NotificationFilter = "all" | "unread";
export type NotificationParticipantModel = "User" | "ApprovedPro" | "Admin";

export interface CreateNotificationData {
  type: NotificationType;
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
}

export interface NotificationListRecord {
  notifications: NotificationRecord[];
  total: number;
}
