import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  type: "message" | "booking" | "quota" | "wallet" | "general";
  title: string;
  description: string;
  userId?: mongoose.Types.ObjectId;
  proId?: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  quotaId?: mongoose.Types.ObjectId;
  walletId?: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    type: { type: String, enum: ["message", "booking", "quota", "wallet", "general"], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    proId: { type: Schema.Types.ObjectId, ref: "ApprovedPro" },
    adminId: { type: Schema.Types.ObjectId, ref: "Admin" },
    chatId: { type: Schema.Types.ObjectId, ref: "Chat" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    quotaId: { type: Schema.Types.ObjectId, ref: "Quota" },
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet" },
    messageId: { type: Schema.Types.ObjectId, ref: "Message" },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    capped: { size: 1024 * 1024 * 10, max: 10000, autoIndexId: true },
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ proId: 1, createdAt: -1 });
notificationSchema.index({ adminId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);