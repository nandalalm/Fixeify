import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITransactionModel {
  transactionId: string;
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
    transactionId: {
      type: String,
      required: true,
      unique: true,
      default: function () {
        // TRX-<yyyyMMddHHmmss>-<4 alphanum>
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        return (
          "TRX-" +
          ts +
          "-" +
          Math.random().toString(36).substr(2, 4).toUpperCase()
        );
      },
    },
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

