import mongoose, { Schema, Document } from "mongoose";
import { Types } from "mongoose";
import { IMessage } from "./messageModel";

export interface IChat extends Document {
  _id: Types.ObjectId;
  participants: { userId: Types.ObjectId; proId: Types.ObjectId };
  lastMessage?: Types.ObjectId | IMessage;
  unreadCount: { participantId: Types.ObjectId; participantModel: "User" | "ApprovedPro"; count: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    participants: {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      proId: { type: Schema.Types.ObjectId, ref: "ApprovedPro", required: true },
    },
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    unreadCount: [
      {
        participantId: { type: Schema.Types.ObjectId, required: true },
        participantModel: { type: String, enum: ["User", "ApprovedPro"], required: true },
        count: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

ChatSchema.index({ "participants.userId": 1, "participants.proId": 1 }, { unique: true });

export const Chat = mongoose.model<IChat>("Chat", ChatSchema);