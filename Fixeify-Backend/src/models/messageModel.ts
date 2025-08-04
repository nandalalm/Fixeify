import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderModel: "User" | "ApprovedPro";
  receiverId: mongoose.Types.ObjectId;
  receiverModel: "User" | "ApprovedPro";
  body: string;
  attachments?: { url: string; mime: string; size: number }[];
  type: "text" | "image" | "file";
  isRead: boolean;
  status: "sent" | "delivered" | "read";
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    senderId: { type: Schema.Types.ObjectId, required: true },
    senderModel: { type: String, enum: ["User", "ApprovedPro"], required: true },
    receiverId: { type: Schema.Types.ObjectId, required: true },
    receiverModel: { type: String, enum: ["User", "ApprovedPro"], required: true },
    body: { type: String, default: "" },
    attachments: [
      {
        url: { type: String, required: true },
        mime: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
    type: { type: String, enum: ["text", "image", "file"], default: "text" },
    isRead: { type: Boolean, default: false },
    status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
  },
  { timestamps: true }
);

export const MessageModel = mongoose.model<IMessage>("Message", messageSchema);