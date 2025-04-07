import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  photo?: string | null;
  phoneNo?: string | null;
  address?: string | null;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
  refreshToken?: string; 
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    photo: { type: String, default: null },
    phoneNo: { type: String, default: null },
    address: { type: String, default: null },
    isBanned: { type: Boolean, default: false },
    refreshToken: { type: String, default: null }, // Optional
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>("User", userSchema);