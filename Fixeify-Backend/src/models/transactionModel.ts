import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITransactionModel {
  proId: Types.ObjectId;
  walletId?: Types.ObjectId;
  amount: number;
  type: "credit" | "debit";
  date: Date;
  quotaId?: Types.ObjectId;
  description?: string;
  bookingId?: Types.ObjectId;
  adminId?: Types.ObjectId;
}

export interface TransactionDocument extends ITransactionModel, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<TransactionDocument>(
  {
    proId: { type: Schema.Types.ObjectId, ref: "ApprovedPro", required: true, index: true },
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: false },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["credit", "debit"], required: true },
    date: { type: Date, default: Date.now },
    quotaId: { type: Schema.Types.ObjectId, ref: "Quota", required: false },
    description: { type: String, required: false },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: false },
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: false },
  },
  { timestamps: true }
);

transactionSchema.index({ proId: 1, createdAt: -1 });

const TransactionModel: Model<TransactionDocument> = mongoose.model<TransactionDocument>("Transaction", transactionSchema);

export default TransactionModel;
