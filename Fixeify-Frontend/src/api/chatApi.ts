import api from "./axios";
import { Conversation, Message, NotificationItem } from "../interfaces/messagesInterface";
import { ChatBase } from "@/Constants/BaseRoutes";
import { NotifBase } from "@/Constants/BaseRoutes";

export const fetchUserChats = async (userId: string, role: "user" | "pro"): Promise<Conversation[]> => {
  if (!userId || !["user", "pro"].includes(role)) {
    throw new Error("Invalid userId or role");
  }
  const response = await api.get(`${ChatBase}/${role}/${userId}/chats`, { withCredentials: true });
  if (!response.data?.chats) {
    throw new Error("No chats found in response");
  }
  return response.data.chats.map((chat: any) => ({
    id: chat.id,
    participants: {
      userId: chat.participants.userId || "",
      userName: chat.participants.userName || "Unknown User",
      userPhoto: chat.participants.userPhoto || null,
      proId: chat.participants.proId || "",
      proName: chat.participants.proName || "Unknown Pro",
      proPhoto: chat.participants.proPhoto || null,
    },
    lastMessage: chat.lastMessage
      ? {
          id: chat.lastMessage.id,
          content: chat.lastMessage.body || chat.lastMessage.content || "",
          senderId: chat.lastMessage.senderId,
          senderModel: chat.lastMessage.senderModel,
          timestamp: chat.lastMessage.timestamp || new Date(chat.lastMessage.createdAt || Date.now()).toISOString(),
          status: chat.lastMessage.isRead ? "read" : chat.lastMessage.status || "sent",
        }
      : undefined,
    unreadCount: chat.unreadCount || 0,
    updatedAt: chat.updatedAt ? new Date(chat.updatedAt).toISOString() : new Date().toISOString(),
  }));
};

export const getExistingChat = async (userId: string, proId: string, role: "user" | "pro"): Promise<Conversation | null> => {
  if (!userId || !proId || !["user", "pro"].includes(role)) {
    throw new Error("Invalid userId, proId, or role");
  }
  try {
    const response = await api.get(`${ChatBase}/existing/${role}/${userId}/${proId}`, { withCredentials: true });
    if (!response.data?.chat) {
      return null;
    }
    const chat = response.data.chat;
    return {
      id: chat.id,
      participants: {
        userId: chat.participants.userId || "",
        userName: chat.participants.userName || "Unknown User",
        userPhoto: chat.participants.userPhoto || null,
        proId: chat.participants.proId || "",
        proName: chat.participants.proName || "Unknown Pro",
        proPhoto: chat.participants.proPhoto || null,
      },
      lastMessage: chat.lastMessage
        ? {
            id: chat.lastMessage.id,
            content: chat.lastMessage.body || chat.lastMessage.content || "",
            senderId: chat.lastMessage.senderId,
            senderModel: chat.lastMessage.senderModel,
            timestamp: chat.lastMessage.timestamp || new Date(chat.lastMessage.createdAt || Date.now()).toISOString(),
            status: chat.lastMessage.isRead ? "read" : chat.lastMessage.status || "sent",
          }
        : undefined,
       unreadCount: chat.unreadCount || 0,
       updatedAt: chat.updatedAt ? new Date(chat.updatedAt).toISOString() : new Date().toISOString(),
     };
  } catch (error) {
    return null;
  }
};

export const createNewChat = async (data: {
  userId: string;
  proId: string;
  role: "user" | "pro";
}): Promise<Conversation> => {
  if (!data.userId || !data.proId || !["user", "pro"].includes(data.role)) {
    throw new Error("Invalid userId, proId, or role");
  }
  const response = await api.post(
    `${ChatBase}/create`,
    { userId: data.userId, proId: data.proId, role: data.role },
    { withCredentials: true }
  );
  const chat = response.data;
  if (!chat || !chat.id || !chat.participants?.userId || !chat.participants?.proId) {
    throw new Error("Invalid chat response: missing required fields");
  }
  return {
    id: chat.id,
    participants: {
      userId: chat.participants.userId,
      userName: chat.participants.userName || "Unknown User",
      userPhoto: chat.participants.userPhoto || null,
      proId: chat.participants.proId,
      proName: chat.participants.proName || "Unknown Pro",
      proPhoto: chat.participants.proPhoto || null,
    },
    lastMessage: chat.lastMessage
      ? {
          id: chat.lastMessage.id,
          content: chat.lastMessage.body || chat.lastMessage.content || "",
          senderId: chat.lastMessage.senderId,
          senderModel: chat.lastMessage.senderModel,
          timestamp: chat.lastMessage.timestamp || new Date(chat.lastMessage.createdAt || Date.now()).toISOString(),
          status: chat.lastMessage.isRead ? "read" : chat.lastMessage.status || "sent",
        }
      : undefined,
    unreadCount: chat.unreadCount || 0,
    updatedAt: chat.createdAt ? new Date(chat.createdAt).toISOString() : new Date().toISOString(),
  };
};

export const fetchChatMessages = async (
  chatId: string,
  page: number = 1,
  limit: number = 20,
  role: "user" | "pro"
): Promise<{ messages: Message[]; total: number }> => {
  if (!chatId) {
    throw new Error("Invalid chatId");
  }
  const response = await api.get(`${ChatBase}/messages/${chatId}`, {
    params: { page, limit, role },
    withCredentials: true,
  });
  if (!response.data?.messages) {
    throw new Error("No messages found in response");
  }
  return {
    messages: response.data.messages.map((msg: any) => ({
      id: msg.id,
      chatId: msg.chatId,
      senderId: msg.senderId,
      senderModel: msg.senderModel,
      receiverId: msg.receiverId,
      receiverModel: msg.receiverModel,
      content: msg.content || msg.body || "",
      timestamp: msg.timestamp || new Date(msg.createdAt || Date.now()).toISOString(),
      isRead: msg.isRead,
      attachments: msg.attachments || [],
      type: msg.type || "text",
      status: msg.isRead ? "read" : msg.status || "sent",
    })),
    total: response.data.total || 0,
  };
};

export const sendNewMessage = async (
  chatId: string,
  senderId: string,
  senderModel: "User" | "ApprovedPro",
  content: string,
  type: "text" | "image" | "file" = "text",
  attachments?: { url: string; mime: string; size: number }[]
): Promise<Message> => {
  if (!chatId || !senderId || !senderModel || !content) {
    throw new Error("Invalid message parameters");
  }
  const response = await api.post(
    `${ChatBase}/messages`,
    { 
      chatId, 
      senderId, 
      senderModel, 
      body: content, 
      type, 
      attachments, 
      role: senderModel === "User" ? "user" : "pro" 
    },
    { withCredentials: true }
  );
  if (!response.data?.id) {
    throw new Error("Invalid message response");
  }
  return {
    id: response.data.id,
    chatId: response.data.chatId,
    senderId: response.data.senderId,
    senderModel: response.data.senderModel,
    receiverId: response.data.receiverId,
    receiverModel: response.data.receiverModel,
    content: response.data.content || response.data.body || "",
    timestamp: response.data.timestamp || new Date(response.data.createdAt || Date.now()).toISOString(),
    isRead: response.data.isRead,
    attachments: response.data.attachments || [],
    type: response.data.type || "text",
    status: response.data.isRead ? "read" : response.data.status || "sent",
  };
};

export const markChatMessagesAsRead = async (chatId: string, userId: string, role: "user" | "pro"): Promise<void> => {
  if (!chatId || !userId || !role) {
    throw new Error("Invalid chatId, userId, or role");
  }
  await api.put(`${ChatBase}/messages/read/${chatId}?role=${role}`, { userId }, { withCredentials: true });
};

export const fetchUserNotifications = async (
  userId: string,
  role: "user" | "pro" | "admin",
  page: number = 1,
  limit: number = 10,
  filter: 'all' | 'unread' = 'all'
): Promise<{ notifications: NotificationItem[]; total: number }> => {
  if (!userId || !["user", "pro", "admin"].includes(role)) {
    throw new Error("Invalid userId or role");
  }
  const response = await api.get(`${NotifBase}/${role}/${userId}`, {
    params: { page, limit, filter },
    withCredentials: true,
  });
  if (!response.data?.notifications) {
    throw new Error("No notifications found in response");
  }
  return {
    notifications: response.data.notifications.map((notif: any) => ({
      id: notif.id,
      title: notif.title,
      description: notif.description,
      timestamp: new Date(notif.timestamp).toISOString(),
      isRead: notif.isRead,
      type: notif.type,
      userId: notif.userId,
      proId: notif.proId,
      adminId: notif.adminId,
      chatId: notif.chatId,
      bookingId: notif.bookingId,
      quotaId: notif.quotaId,
      walletId: notif.walletId,
      messageId: notif.messageId,
    })),
    total: response.data.total || 0,
  };
};

export const markSingleNotificationAsRead = async (notificationId: string): Promise<void> => {
  if (!notificationId) {
    throw new Error("Invalid notificationId");
  }
  await api.put(`${NotifBase}/read/${notificationId}`, {}, { withCredentials: true });
};

export const markAllNotificationsAsRead = async (userId: string, role: "user" | "pro" | "admin"): Promise<void> => {
  if (!userId || !["user", "pro", "admin"].includes(role)) {
    throw new Error("Invalid userId or role");
  }
  await api.put(`${NotifBase}/read-all/${role}/${userId}`, {}, { withCredentials: true });
};

export const fetchMessageNotifications = async (
  userId: string,
  role: "user" | "pro" | "admin",
  page: number = 1,
  limit: number = 10,
  filter: 'all' | 'unread' = 'all'
): Promise<{ notifications: NotificationItem[]; total: number }> => {
  if (!userId || !["user", "pro", "admin"].includes(role)) {
    throw new Error("Invalid userId or role");
  }
  const response = await api.get(`${NotifBase}/messages/${role}/${userId}`, {
    params: { page, limit, filter },
    withCredentials: true,
  });
  if (!response.data?.notifications) {
    throw new Error("No message notifications found in response");
  }
  return {
    notifications: response.data.notifications.map((notif: any) => ({
      id: notif.id,
      title: notif.title,
      description: notif.description,
      timestamp: new Date(notif.timestamp).toISOString(),
      isRead: notif.isRead,
      type: notif.type,
      userId: notif.userId,
      proId: notif.proId,
      adminId: notif.adminId,
      chatId: notif.chatId,
      bookingId: notif.bookingId,
      quotaId: notif.quotaId,
      walletId: notif.walletId,
      messageId: notif.messageId,
    })),
    total: response.data.total || 0,
  };
};

export const fetchNonMessageNotifications = async (
  userId: string,
  role: "user" | "pro" | "admin",
  page: number = 1,
  limit: number = 10,
  filter: 'all' | 'unread' = 'all'
): Promise<{ notifications: NotificationItem[]; total: number }> => {
  if (!userId || !["user", "pro", "admin"].includes(role)) {
    throw new Error("Invalid userId or role");
  }
  const response = await api.get(`${NotifBase}/non-messages/${role}/${userId}`, {
    params: { page, limit, filter },
    withCredentials: true,
  });
  if (!response.data?.notifications) {
    throw new Error("No non-message notifications found in response");
  }
  return {
    notifications: response.data.notifications.map((notif: any) => ({
      id: notif.id,
      title: notif.title,
      description: notif.description,
      timestamp: new Date(notif.timestamp).toISOString(),
      isRead: notif.isRead,
      type: notif.type,
      userId: notif.userId,
      proId: notif.proId,
      adminId: notif.adminId,
      chatId: notif.chatId,
      bookingId: notif.bookingId,
      quotaId: notif.quotaId,
      walletId: notif.walletId,
      messageId: notif.messageId,
    })),
    total: response.data.total || 0,
  };
};

export const markAllMessageNotificationsAsRead = async (userId: string, role: "user" | "pro" | "admin"): Promise<void> => {
  if (!userId || !["user", "pro", "admin"].includes(role)) {
    throw new Error("Invalid userId or role");
  }
  await api.put(`${NotifBase}/read-all-messages/${role}/${userId}`, {}, { withCredentials: true });
};

export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
  role: "user" | "pro" | "admin";
}

export interface MUser extends User {}

export interface NotificationToastProps {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

