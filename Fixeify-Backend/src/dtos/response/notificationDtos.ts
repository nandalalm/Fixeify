export interface NotificationResponse {
  id: string;
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
  isRead: boolean;
  timestamp: string;
}

export interface CreateNotificationRequest {
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
}