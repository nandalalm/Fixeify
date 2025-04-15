import mongoose, { Schema, Document } from "mongoose";
import { IPendingPro } from "./pendingProModel";

export interface IApprovedPro extends IPendingPro {
  isBanned: boolean;
  password: string;
  about?: string | null; // Can be null, to be filled by pro later
}

export interface ApprovedProDocument extends IApprovedPro, Document {
  _id: mongoose.Types.ObjectId; // 👈 Add this line to fix the typing
}


const approvedProSchema = new Schema<ApprovedProDocument>(
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
    isBanned: { type: Boolean, default: false },
    password: { type: String, required: true },
    about: { type: String, default: null}, 
  },
  { timestamps: true }
);

export const ApprovedProModel = mongoose.model<ApprovedProDocument>("ApprovedPro", approvedProSchema);
export default ApprovedProModel;