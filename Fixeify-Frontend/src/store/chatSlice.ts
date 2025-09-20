import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { Conversation, Message, NotificationItem } from "../interfaces/messagesInterface";
import {
  fetchUserChats,
  createNewChat,
  fetchChatMessages,
  sendNewMessage,
  markChatMessagesAsRead,
  fetchUserNotifications,
  markSingleNotificationAsRead,
  markAllNotificationsAsRead,
  fetchMessageNotifications,
  fetchNonMessageNotifications,
  markAllMessageNotificationsAsRead,
  getExistingChat,
} from "../api/chatApi";

interface ChatState {
  conversations: Conversation[];
  messages: { [chatId: string]: Message[] };
  notifications: NotificationItem[];
  messageNotifications: NotificationItem[];
  nonMessageNotifications: NotificationItem[];
  onlineUsers: { [userId: string]: boolean };
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: ChatState = {
  conversations: [],
  messages: {},
  notifications: [],
  messageNotifications: [],
  nonMessageNotifications: [],
  onlineUsers: {},
  status: "idle",
  error: null,
};

export const fetchConversations = createAsyncThunk<
  Conversation[],
  { userId: string; role: "user" | "pro" },
  { rejectValue: string }
>(
  "chat/fetchConversations",
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      const conversations = await fetchUserChats(userId, role);
      return conversations;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch conversations");
    }
  }
);

export const fetchExistingChat = createAsyncThunk<
  Conversation | null,
  { userId: string; proId: string; role: "user" | "pro" },
  { rejectValue: string }
>(
  "chat/fetchExistingChat",
  async ({ userId, proId, role }, { rejectWithValue }) => {
    try {
      const conversation = await getExistingChat(userId, proId, role);
      return conversation;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch existing chat");
    }
  }
);

export const createChat = createAsyncThunk<
  Conversation,
  { userId: string; proId: string; role: "user" | "pro" },
  { rejectValue: string }
>(
  "chat/createChat",
  async ({ userId, proId, role }, { rejectWithValue }) => {
    try {
      const conversation: Conversation = await createNewChat({ userId, proId, role });
      return conversation;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to create chat");
    }
  }
);

export const fetchConversationMessages = createAsyncThunk<
  { chatId: string; messages: Message[]; total: number },
  { chatId: string; page: number; limit: number; role: "user" | "pro" },
  { rejectValue: string }
>(
  "chat/fetchConversationMessages",
  async ({ chatId, page, limit, role }, { rejectWithValue }) => {
    try {
      const { messages, total } = await fetchChatMessages(chatId, page, limit, role);
      return { chatId, messages, total };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch messages");
    }
  }
);

export const sendChatMessage = createAsyncThunk<
  Message,
  {
    chatId: string;
    senderId: string;
    senderModel: "User" | "ApprovedPro";
    content: string;
    type?: "text" | "image" | "file";
    attachments?: { url: string; mime: string; size: number }[];
  },
  { rejectValue: string }
>(
  "chat/sendChatMessage",
  async ({ chatId, senderId, senderModel, content, type, attachments }, { rejectWithValue }) => {
    try {
      const message: Message = await sendNewMessage(chatId, senderId, senderModel, content, type, attachments);
      return message;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to send message");
    }
  }
);

export const markMessagesRead = createAsyncThunk<
  string,
  { chatId: string; userId: string; role: "user" | "pro" },
  { rejectValue: string }
>(
  "chat/markMessagesRead",
  async ({ chatId, userId, role }, { rejectWithValue }) => {
    try {
      await markChatMessagesAsRead(chatId, userId, role);
      return chatId;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark messages as read");
    }
  }
);

export const fetchAllNotifications = createAsyncThunk<
  NotificationItem[],
  { userId: string; role: "user" | "pro" | "admin"; page: number; limit: number; filter: 'all' | 'unread' },
  { rejectValue: string }
>(
  "chat/fetchAllNotifications",
  async ({ userId, role, page, limit, filter }, { rejectWithValue }) => {
    try {
      const { notifications } = await fetchUserNotifications(userId, role, page, limit, filter);
      return notifications;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch notifications");
    }
  }
);

export const markNotificationRead = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  "chat/markNotificationRead",
  async (notificationId, { rejectWithValue }) => {
    try {
      await markSingleNotificationAsRead(notificationId);
      return notificationId;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark notification as read");
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk<
  void,
  { userId: string; role: "user" | "pro" | "admin" },
  { rejectValue: string }
>(
  "chat/markAllNotificationsRead",
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      await markAllNotificationsAsRead(userId, role);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark all notifications as read");
    }
  }
);

// NEW: Fetch message notifications only
export const fetchAllMessageNotifications = createAsyncThunk<
  NotificationItem[],
  { userId: string; role: "user" | "pro" | "admin"; page: number; limit: number; filter: 'all' | 'unread' },
  { rejectValue: string }
>(
  "chat/fetchAllMessageNotifications",
  async ({ userId, role, page, limit, filter }, { rejectWithValue }) => {
    try {
      const { notifications } = await fetchMessageNotifications(userId, role, page, limit, filter);
      return notifications;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch message notifications");
    }
  }
);

export const fetchAllNonMessageNotifications = createAsyncThunk<
  NotificationItem[],
  { userId: string; role: "user" | "pro" | "admin"; page: number; limit: number; filter: 'all' | 'unread' },
  { rejectValue: string }
>(
  "chat/fetchAllNonMessageNotifications",
  async ({ userId, role, page, limit, filter }, { rejectWithValue }) => {
    try {
      const { notifications } = await fetchNonMessageNotifications(userId, role, page, limit, filter);
      return notifications;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch non-message notifications");
    }
  }
);
export const markAllMessageNotificationsRead = createAsyncThunk<
  void,
  { userId: string; role: "user" | "pro" | "admin" },
  { rejectValue: string }
>(
  "chat/markAllMessageNotificationsRead",
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      await markAllMessageNotificationsAsRead(userId, role);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark all message notifications as read");
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      
      if (!state.messages[message.chatId]) {
        state.messages[message.chatId] = [];
      }
      
      const existingMessageIndex = state.messages[message.chatId].findIndex(
        (msg) => msg.id === message.id
      );
      
      if (existingMessageIndex === -1) {
        state.messages[message.chatId].push(message);
        state.messages[message.chatId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      } else {
        state.messages[message.chatId][existingMessageIndex] = message;
      }
      
      const conversation = state.conversations.find((conv) => conv.id === message.chatId);
      if (conversation) {
        
        conversation.lastMessage = {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          senderModel: message.senderModel,
          timestamp: message.timestamp,
          status: message.status,
        };
        
      
        if (!message.isRead) {
          conversation.unreadCount += 1;
        }
        
        conversation.updatedAt = new Date().toISOString();
        
      }
    },
  
    addIncomingMessage: (
      state,
      action: PayloadAction<{ message: Message; currentUserId: string; activeChatId?: string }>
    ) => {
      const { message, currentUserId, activeChatId } = action.payload;

      if (!state.messages[message.chatId]) {
        state.messages[message.chatId] = [];
      }

      const existingIndex = state.messages[message.chatId].findIndex(m => m.id === message.id);
      if (existingIndex === -1) {
        state.messages[message.chatId].push(message);
        state.messages[message.chatId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      } else {
        state.messages[message.chatId][existingIndex] = message;
      }

      const conversation = state.conversations.find((c) => c.id === message.chatId);
      if (conversation) {
        conversation.lastMessage = {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          senderModel: message.senderModel,
          timestamp: message.timestamp,
          status: message.status,
        };

      
        const isFromOther = message.senderId !== currentUserId;
        const isActiveChat = activeChatId === message.chatId;
        
        if (isFromOther && !isActiveChat) {
        
          conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        } else if (isFromOther && isActiveChat) {
        
          conversation.unreadCount = 0;
        
          if (state.messages[message.chatId]) {
            const messageIndex = state.messages[message.chatId].findIndex(m => m.id === message.id);
            if (messageIndex !== -1) {
              state.messages[message.chatId][messageIndex].isRead = true;
              state.messages[message.chatId][messageIndex].status = "read";
            }
          }
        }

        conversation.updatedAt = new Date().toISOString();
      }
    },
    setConversationLastMessageStatus: (
      state,
      action: PayloadAction<{ chatId: string; status: "sent" | "delivered" | "read" }>
    ) => {
      const { chatId, status } = action.payload;
      const conversation = state.conversations.find((c) => c.id === chatId);
      if (conversation && conversation.lastMessage) {
        conversation.lastMessage.status = status;
      }
    },
    updateConversation: (state, action: PayloadAction<any>) => {
      const updatedConversation = action.payload;
      const index = state.conversations.findIndex((c) => c.id === updatedConversation.id);
      if (index !== -1) {
        state.conversations[index] = updatedConversation;
      }
    },
    addNotification: (state, action: PayloadAction<NotificationItem>) => {
      state.notifications.unshift(action.payload);
      if (action.payload.type === "message") {
        state.messageNotifications.unshift(action.payload);
      } else {
        state.nonMessageNotifications.unshift(action.payload);
      }
    },
    addMessageNotification: (state, action: PayloadAction<NotificationItem>) => {
      state.messageNotifications.unshift(action.payload);
    },
    addNonMessageNotification: (state, action: PayloadAction<NotificationItem>) => {
      state.nonMessageNotifications.unshift(action.payload);
    },
    updateOnlineStatus: (state, action: PayloadAction<{ userId: string; isOnline: boolean }>) => {
      state.onlineUsers[action.payload.userId] = action.payload.isOnline;
    },
    clearChatError: (state) => {
      state.error = null;
    },
    updateMessageStatus: (state, action: PayloadAction<{ chatId: string; messageId: string; status: "sent" | "delivered" | "read" }>) => {
      const { chatId, messageId, status } = action.payload;
      if (state.messages[chatId]) {
        const messageIndex = state.messages[chatId].findIndex(msg => msg.id === messageId);
        if (messageIndex !== -1) {
          state.messages[chatId][messageIndex].status = status;
          if (status === "read") {
            state.messages[chatId][messageIndex].isRead = true;
          }
        }
      }
    },
    clearMessages: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      delete state.messages[chatId];
    },
    updateConversationReadStatus: (state, action: PayloadAction<{ chatId: string }>) => {
      const { chatId } = action.payload;
      const conversation = state.conversations.find((conv) => conv.id === chatId);
      if (conversation) {
      
        conversation.unreadCount = 0;
      }
      if (state.messages[chatId]) {
        state.messages[chatId] = state.messages[chatId].map((msg) => ({
          ...msg,
          isRead: true,
          status: "read" as "read",
        }));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(fetchExistingChat.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchExistingChat.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload && !state.conversations.find((conv) => conv.id === action.payload!.id)) {
          state.conversations.push(action.payload);
        }
      })
      .addCase(fetchExistingChat.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(createChat.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createChat.fulfilled, (state, action) => {
        state.status = "succeeded";
        const newConversation = action.payload;
        if (!state.conversations.find((conv) => conv.id === newConversation.id)) {
          state.conversations.push(newConversation);
        }
      })
      .addCase(createChat.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(fetchConversationMessages.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchConversationMessages.fulfilled, (state, action) => {
        const { chatId, messages } = action.payload;
        if (!state.messages[chatId]) {
          state.messages[chatId] = [];
        }
        
        if (action.meta.arg.page === 1) {
      
          state.messages[chatId] = [...messages].reverse();
        } else {
         
          const olderMessages = [...messages].reverse();
          state.messages[chatId] = [...olderMessages, ...state.messages[chatId]];
        }
        
        state.status = "succeeded";
      })
      .addCase(fetchConversationMessages.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(sendChatMessage.pending, (state) => {
        state.status = "loading";
      })
      .addCase(sendChatMessage.fulfilled, (state, action: PayloadAction<Message>) => {
        const message = action.payload;
        if (!state.messages[message.chatId]) {
          state.messages[message.chatId] = [];
        }
        state.messages[message.chatId].push(message);
        state.messages[message.chatId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        const conversation = state.conversations.find((conv) => conv.id === message.chatId);
        if (conversation) {
          conversation.lastMessage = {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            senderModel: message.senderModel,
            timestamp: message.timestamp,
            status: message.status,
          };
          conversation.updatedAt = new Date().toISOString();
        }
        state.status = "succeeded";
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(markMessagesRead.pending, (state) => {
        state.status = "loading";
      })
      .addCase(markMessagesRead.fulfilled, (state, action) => {
        const chatId = action.payload;
        if (!state.messages[chatId]) {
          state.messages[chatId] = [];
        }
        state.messages[chatId] = state.messages[chatId].map((msg) => ({
          ...msg,
          isRead: true,
          status: "read" as "read",
        }));
        const conversation = state.conversations.find((conv) => conv.id === chatId);
        if (conversation) {
          conversation.unreadCount = 0;
        }
        state.status = "succeeded";
      })
      .addCase(markMessagesRead.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(fetchAllNotifications.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAllNotifications.fulfilled, (state, action) => {
        state.status = "succeeded";
        const page = action.meta.arg.page;
        if (page === 1) {
          state.notifications = action.payload;
        } else {
          // Append new notifications, avoiding duplicates
          const existingIds = new Set(state.notifications.map(n => n.id));
          const newNotifs = action.payload.filter(n => !existingIds.has(n.id));
          state.notifications = [...state.notifications, ...newNotifs];
        }
      })
      .addCase(fetchAllNotifications.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(markNotificationRead.pending, (state) => {
        state.status = "loading";
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const notification = state.notifications.find((n) => n.id === notificationId);
        if (notification) {
          notification.isRead = true;
        }
        // Also update in specific arrays
        const messageNotification = state.messageNotifications.find((n) => n.id === notificationId);
        if (messageNotification) {
          messageNotification.isRead = true;
        }
        const nonMessageNotification = state.nonMessageNotifications.find((n) => n.id === notificationId);
        if (nonMessageNotification) {
          nonMessageNotification.isRead = true;
        }
        state.status = "succeeded";
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(markAllNotificationsRead.pending, (state) => {
        state.status = "loading";
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({ ...n, isRead: true }));
        state.status = "succeeded";
      })
      .addCase(markAllNotificationsRead.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(fetchAllMessageNotifications.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAllMessageNotifications.fulfilled, (state, action) => {
        state.status = "succeeded";
        const page = action.meta.arg.page;
        if (page === 1) {
          state.messageNotifications = action.payload;
        } else {
          const existingIds = new Set(state.messageNotifications.map(n => n.id));
          const newNotifs = action.payload.filter(n => !existingIds.has(n.id));
          state.messageNotifications = [...state.messageNotifications, ...newNotifs];
        }
      })
      .addCase(fetchAllMessageNotifications.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(fetchAllNonMessageNotifications.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAllNonMessageNotifications.fulfilled, (state, action) => {
        state.status = "succeeded";
        const page = action.meta.arg.page;
        if (page === 1) {
          state.nonMessageNotifications = action.payload;
        } else {
          const existingIds = new Set(state.nonMessageNotifications.map(n => n.id));
          const newNotifs = action.payload.filter(n => !existingIds.has(n.id));
          state.nonMessageNotifications = [...state.nonMessageNotifications, ...newNotifs];
        }
      })
      .addCase(fetchAllNonMessageNotifications.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(markAllMessageNotificationsRead.pending, (state) => {
        state.status = "loading";
      })
      .addCase(markAllMessageNotificationsRead.fulfilled, (state) => {
        state.messageNotifications = state.messageNotifications.map((n) => ({ ...n, isRead: true }));
        state.status = "succeeded";
      })
      .addCase(markAllMessageNotificationsRead.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const {
  addMessage,
  addIncomingMessage,
  addNotification,
  addMessageNotification,
  addNonMessageNotification,
  updateOnlineStatus,
  clearChatError,
  updateMessageStatus,
  clearMessages,
  updateConversationReadStatus,
  setConversationLastMessageStatus,
  updateConversation,
} = chatSlice.actions;

export default chatSlice.reducer;