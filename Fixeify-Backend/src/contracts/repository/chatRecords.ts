import type { Types } from "mongoose";
import type { IChat } from "../../models/chatModel";
import type { IMessage } from "../../models/messageModel";

export interface PopulatedChatUserRecord {
  _id: Types.ObjectId;
  name: string;
  photo?: string | null;
}

export interface PopulatedChatProRecord {
  _id: Types.ObjectId;
  firstName: string;
  lastName?: string;
  profilePhoto?: string | null;
}

export type PopulatedChatRecord = Omit<IChat, "participants" | "lastMessage"> & {
  participants: {
    userId: PopulatedChatUserRecord;
    proId: PopulatedChatProRecord;
  };
  lastMessage?: IMessage;
};

export type MessageRecord = IMessage;

export interface MessageListRecord {
  messages: MessageRecord[];
  total: number;
}

export interface CreateMessageData {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderModel: "User" | "ApprovedPro";
  receiverId: Types.ObjectId;
  receiverModel: "User" | "ApprovedPro";
  body?: string;
  attachments?: { url: string; mime: string; size: number }[];
  type: "text" | "image" | "file";
  isRead: boolean;
  status: "sent" | "delivered" | "read";
}
