import type { Types } from "mongoose";

export interface WalletQuotaReferenceRecord {
  _id: Types.ObjectId;
  bookingId?: Types.ObjectId;
  userId?: Types.ObjectId;
  totalCost?: number;
}

export interface WalletBookingReferenceRecord {
  _id: Types.ObjectId;
}

export interface WalletTransactionRecord {
  _id: Types.ObjectId;
  transactionId?: string;
  amount: number;
  type: "credit" | "debit";
  date: Date;
  description?: string;
  bookingId?: Types.ObjectId | WalletBookingReferenceRecord;
  quotaId?: Types.ObjectId | WalletQuotaReferenceRecord;
}

export interface WalletWithTransactionsRecord {
  _id: Types.ObjectId;
  proId: Types.ObjectId;
  balance: number;
  transactions: WalletTransactionRecord[];
  createdAt: Date;
  updatedAt: Date;
}
