export interface TransactionResponse {
  id: string;
  transactionId: string;
  proId: string;
  walletId?: string;
  amount: number;
  type: "credit" | "debit";
  date: Date;
  description?: string;
  bookingId?: string;
  quotaId?: string;
  adminId?: string;
  createdAt: Date;
  updatedAt: Date;
}
