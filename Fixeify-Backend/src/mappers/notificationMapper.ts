import type { NotificationResponse } from "../dtos/response/notificationDtos";
import type { NotificationRecord } from "../contracts/repository/notificationRecords";

export const toNotificationResponse = (notification: NotificationRecord): NotificationResponse => ({
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
});

export const toNotificationResponses = (notifications: NotificationRecord[]): NotificationResponse[] =>
  notifications.map(toNotificationResponse);
