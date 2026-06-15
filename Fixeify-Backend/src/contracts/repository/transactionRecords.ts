import type { TransactionDocument } from "../../models/transactionModel";

export type TransactionRecord = TransactionDocument;

export interface FindTransactionByKeysFilter {
  bookingId: string;
  type: "credit" | "debit";
  proId: string;
  amount: number;
  adminId?: string;
}
