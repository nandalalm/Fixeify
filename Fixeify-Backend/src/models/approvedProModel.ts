import mongoose, { Schema, Document } from "mongoose";
import { ILocation, IAvailability, ITimeSlot } from "./pendingProModel";

export interface IApprovedPro {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  categoryId: mongoose.Types.ObjectId;
  customService?: string;
  location: ILocation;
  profilePhoto: string;
  idProof: string[];
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  availability: IAvailability;
  isBanned: boolean;
  password: string;
  about?: string | null;
  isBooked: boolean;
  isUnavailable: boolean;
}

export interface ApprovedProDocument extends IApprovedPro, Document {
  _id: mongoose.Types.ObjectId;
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
  },
  { _id: false }
);

const availabilitySchema = new Schema<IAvailability>(
  {
    monday: { type: [timeSlotSchema], default: [] },
    tuesday: { type: [timeSlotSchema], default: [] },
    wednesday: { type: [timeSlotSchema], default: [] },
    thursday: { type: [timeSlotSchema], default: [] },
    friday: { type: [timeSlotSchema], default: [] },
    saturday: { type: [timeSlotSchema], default: [] },
    sunday: { type: [timeSlotSchema], default: [] },
  },
  { _id: false }
);

const approvedProSchema = new Schema<ApprovedProDocument>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    customService: { type: String },
    location: { type: locationSchema, required: true },
    profilePhoto: { type: String, required: true },
    idProof: { type: [String], required: true },
    accountHolderName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    availability: { type: availabilitySchema, default: {} },
    isBanned: { type: Boolean, default: false },
    password: { type: String, required: true },
    about: { type: String, default: null },
    isBooked: { type: Boolean, default: false },
    isUnavailable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

approvedProSchema.index({ "location.coordinates": "2dsphere" });

export const ApprovedProModel = mongoose.model<ApprovedProDocument>("ApprovedPro", approvedProSchema);
export default ApprovedProModel;