import type { ChatResponse, MessageResponse } from "../dtos/response/chatDtos";
import type { MessageRecord, PopulatedChatRecord } from "../contracts/repository/chatRecords";

export const toChatResponse = (
  chat: PopulatedChatRecord,
  participantId: string,
  participantModel: "User" | "ApprovedPro"
): ChatResponse => {
  const unread = chat.unreadCount?.find(
    (item) => item.participantId.toString() === participantId && item.participantModel === participantModel
  );

  const proName = `${chat.participants.proId.firstName} ${chat.participants.proId.lastName || ""}`.trim();

  return {
    id: chat._id.toString(),
    participants: {
      userId: chat.participants.userId._id.toString(),
      userName: chat.participants.userId.name,
      userPhoto: chat.participants.userId.photo || null,
      proId: chat.participants.proId._id.toString(),
      proName,
      proPhoto: chat.participants.proId.profilePhoto || null,
    },
    lastMessage: chat.lastMessage
      ? {
          id: chat.lastMessage._id.toString(),
          body: chat.lastMessage.body,
          content: chat.lastMessage.body,
          senderId: chat.lastMessage.senderId.toString(),
          senderModel: chat.lastMessage.senderModel,
          timestamp: chat.lastMessage.createdAt.toISOString(),
          status: chat.lastMessage.isRead ? "read" : chat.lastMessage.status,
        }
      : undefined,
    unreadCount: unread ? unread.count : 0,
    createdAt: chat.createdAt,
  };
};

export const toMessageResponse = (message: MessageRecord): MessageResponse => ({
  id: message._id.toString(),
  chatId: message.chatId.toString(),
  senderId: message.senderId.toString(),
  senderModel: message.senderModel,
  receiverId: message.receiverId.toString(),
  receiverModel: message.receiverModel,
  content: message.body,
  attachments: message.attachments,
  type: message.type,
  isRead: message.isRead,
  status: message.isRead ? "read" : message.status,
  timestamp: message.createdAt.toISOString(),
});

export const toMessageResponses = (messages: MessageRecord[]): MessageResponse[] =>
  messages.map(toMessageResponse);
