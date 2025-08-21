import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITimeSlot {
  startTime: string;
  endTime: string;
  booked: boolean;
}

export interface ILocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

const locationSchema = new Schema<ILocation>(
  {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    coordinates: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
  },
  { _id: false }
);

const timeSlotSchema = new Schema<ITimeSlot>(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    booked: { type: Boolean, default: false },
  },
  { _id: false }
);

export interface IBooking {
  userId: mongoose.Types.ObjectId;
  proId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  issueDescription: string;
  location: ILocation;
  phoneNumber: string;
  preferredDate: Date;
  preferredTime: ITimeSlot[];
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  rejectedReason?: string;
  cancelReason?: string;
  isRated?: boolean;
  hasComplaintRaisedByPro?: boolean;
  hasComplaintRaisedByUser?: boolean;
  adminRevenue?: number;
  proRevenue?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingDocument extends IBooking, Document {
  _id: mongoose.Types.ObjectId;
}

const bookingSchema = new Schema<BookingDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    proId: { type: Schema.Types.ObjectId, ref: "ApprovedPro", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    issueDescription: { type: String, required: true },
    location: { type: locationSchema, required: true },
    phoneNumber: { type: String, required: true },
    preferredDate: { type: Date, required: true },
    preferredTime: { type: [timeSlotSchema], required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
      default: "pending",
    },
    rejectedReason: { type: String },
    cancelReason: { type: String },
    isRated: { type: Boolean, default: false },
    hasComplaintRaisedByPro: { type: Boolean, default: false },
    hasComplaintRaisedByUser: { type: Boolean, default: false },
    adminRevenue: { type: Number },
    proRevenue: { type: Number },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Booking: Model<BookingDocument> = mongoose.model<BookingDocument>("Booking", bookingSchema);
export default Booking;