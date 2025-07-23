import { Schema, model, Document, Types } from "mongoose";

export interface WithdrawalRequestDocument extends Document {
  _id: Types.ObjectId;
  proId: Types.ObjectId;
  amount: number;
  paymentMode: "bank" | "upi";
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiCode?: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalRequestSchema = new Schema<WithdrawalRequestDocument>(
  {
    proId: { type: Schema.Types.ObjectId, ref: "Pro", required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ["bank", "upi"], required: true },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    branchName: { type: String },
    upiCode: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export default model<WithdrawalRequestDocument>("WithdrawalRequest", withdrawalRequestSchema);