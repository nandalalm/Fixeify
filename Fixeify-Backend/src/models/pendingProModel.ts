import mongoose, { Schema, Document } from "mongoose";

export interface IPendingPro {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  serviceType: string;
  customService?: string;
  skills: string[];
  location: string;
  profilePhoto: string;
  idProof: string[];
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  availability: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  workingHours: string;
  createdAt: Date;
}

export interface PendingProDocument extends IPendingPro, Document {}

const pendingProSchema = new Schema<PendingProDocument>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    serviceType: { type: String, required: true },
    customService: { type: String },
    skills: { type: [String], required: true },
    location: { type: String, required: true },
    profilePhoto: { type: String, required: true },
    idProof: { type: [String], required: true },
    accountHolderName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    availability: {
      monday: { type: Boolean, default: false },
      tuesday: { type: Boolean, default: false },
      wednesday: { type: Boolean, default: false },
      thursday: { type: Boolean, default: false },
      friday: { type: Boolean, default: false },
      saturday: { type: Boolean, default: false },
      sunday: { type: Boolean, default: false },
    },
    workingHours: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const PendingProModel = mongoose.model<PendingProDocument>("PendingPro", pendingProSchema);

export default PendingProModel;