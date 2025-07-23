import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITransaction {
  _id: Types.ObjectId; 
  amount: number;
  type: "credit" | "debit";
  date: Date;
  quotaId?: Types.ObjectId; 
}

export interface IWallet {
  proId: mongoose.Types.ObjectId;
  balance: number;
  transactions: ITransaction[];
}

export interface WalletDocument extends IWallet, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["credit", "debit"], required: true },
    date: { type: Date, default: Date.now },
    quotaId: { type: Schema.Types.ObjectId, ref: "Quota", required: false }, 
  },
  { _id: true } 
);

const walletSchema = new Schema<WalletDocument>(
  {
    proId: { type: Schema.Types.ObjectId, ref: "ApprovedPro", required: true, unique: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    transactions: { type: [transactionSchema], default: [] },
  },
  { timestamps: true }
);

const WalletModel: Model<WalletDocument> = mongoose.model<WalletDocument>("Wallet", walletSchema);

export default WalletModel;