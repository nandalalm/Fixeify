export interface ChatResponse {
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
    body?: string;
    content?: string;
    senderId: string;
    senderModel: "User" | "ApprovedPro";
    timestamp: string;
    status?: "sent" | "delivered" | "read";
  };
  unreadCount: number;
  createdAt: Date;
}

export interface MessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  senderModel: "User" | "ApprovedPro";
  receiverId: string;
  receiverModel: "User" | "ApprovedPro";
  content?: string;
  type: "text" | "image" | "file";
  isRead: boolean;
  status: "sent" | "delivered" | "read";
  attachments?: { url: string; mime: string; size: number }[];
  timestamp: string;
}

export interface CreateChatRequest {
  userId?: string;
  proId: string;
  role: string;
}

export interface SendMessageRequest {
  chatId: string;
  senderId?: string;
  senderModel: "User" | "ApprovedPro";
  body?: string;
  attachments?: { url: string; mime: string; size: number }[];
  role: string;
  type?: "text" | "image" | "file";
}