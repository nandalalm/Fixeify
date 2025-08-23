import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  revenue: number; 
  createdAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    revenue: { type: Number, default: 0 }, 
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.model<IAdmin>("Admin", adminSchema);