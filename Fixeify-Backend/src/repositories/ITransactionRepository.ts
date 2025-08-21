import { TransactionDocument } from "../models/transactionModel";

export interface TransactionResponseDTO {
  id: string;
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

export interface ITransactionRepository {
  createTransaction(data: Partial<TransactionDocument>): Promise<TransactionResponseDTO>;
  findByProIdPaginated(proId: string, page: number, limit: number): Promise<{ transactions: TransactionResponseDTO[]; total: number }>;
  findByAdminIdPaginated(adminId: string, page: number, limit: number): Promise<{ transactions: TransactionResponseDTO[]; total: number }>;
}
