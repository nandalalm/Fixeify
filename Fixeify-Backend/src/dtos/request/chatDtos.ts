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
