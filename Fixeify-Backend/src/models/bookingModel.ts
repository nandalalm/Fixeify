import mongoose, { Schema, Document } from "mongoose";
import { ILocation } from "./userModel";

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  proId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  issueDescription: string;
  location: ILocation;
  phoneNumber: string;
  preferredDate: Date;
  preferredTime: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    proId: { type: Schema.Types.ObjectId, ref: "ApprovedPro", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    issueDescription: { type: String, required: true, minlength: 10, maxlength: 500 },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      coordinates: {
        type: { type: String, enum: ["Point"], required: true },
        coordinates: { type: [Number], required: true },
      },
    },
    phoneNumber: { type: String, required: true, match: [/^\d{10}$/, "Phone number must be a 10-digit number"] },
    preferredDate: { type: Date, required: true },
    preferredTime: { type: String, required: true, match: [/^\d{2}:\d{2}$/, "Time must be in HH:MM format"] },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
      default: "pending",
    },
    rejectedReason: { type: String, required: false },
  },
  { timestamps: true }
);

bookingSchema.index({ "location.coordinates": "2dsphere" });

export default mongoose.model<IBooking>("Booking", bookingSchema);