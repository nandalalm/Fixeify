import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IWallet {
  proId: mongoose.Types.ObjectId;
  balance: number;
}

export interface WalletDocument extends IWallet, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<WalletDocument>(
  {
    proId: { type: Schema.Types.ObjectId, ref: "ApprovedPro", required: true, unique: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

const WalletModel: Model<WalletDocument> = mongoose.model<WalletDocument>("Wallet", walletSchema);

export default WalletModel;