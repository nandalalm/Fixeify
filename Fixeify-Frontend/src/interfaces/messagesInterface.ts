export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string; 
  role: "user" | "pro" | "admin";
}

export interface MUser extends User {}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderModel: "User" | "ApprovedPro";
  receiverId: string;
  receiverModel: "User" | "ApprovedPro";
  content?: string;
  timestamp: string; 
  isRead: boolean;
  attachments?: { url: string; mime: string; size: number }[];
  type: "text" | "image" | "file";
  status: "sent" | "delivered" | "read";
}

export interface Conversation {
  id: string;
  participants: {
    userId: string;
    userName: string;
    userPhoto?: string | null;
    proId: string;
    proName: string;
    proPhoto?: string | null;
  };
  lastMessage?: {
    id: string;
    content?: string;
    senderId: string;
    senderModel: "User" | "ApprovedPro";
    timestamp: string; 
    status: "sent" | "delivered" | "read";
  };
  unreadCount: number;
  updatedAt: string; 
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string; 
  isRead: boolean;
  type: "message" | "booking" | "quota" | "wallet" | "general";
  userId?: string;
  proId?: string;
  chatId?: string;
  bookingId?: string;
  quotaId?: string;
  walletId?: string;
  messageId?: string;
}