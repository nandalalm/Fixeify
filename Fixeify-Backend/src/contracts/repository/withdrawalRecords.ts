import type { Types } from "mongoose";
import type { WithdrawalRequestDocument } from "../../models/withdrawalRequestModel";

export type WithdrawalRequestRecord = WithdrawalRequestDocument;

export interface CreateWithdrawalRequestData {
  proId: Types.ObjectId;
  amount: number;
  paymentMode: "bank" | "upi";
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiCode?: string;
  bookingId?: Types.ObjectId;
  quotaId?: Types.ObjectId;
  status?: "pending" | "approved" | "rejected";
}

export interface UpdateWithdrawalRequestData {
  status?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

export interface TotalWithdrawnAggregateRecord {
  _id: null;
  totalWithdrawn: number;
}
