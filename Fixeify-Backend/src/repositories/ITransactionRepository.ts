import type { ClientSession } from "mongoose";
import type { TransactionDocument } from "../models/transactionModel";
import type { FindTransactionByKeysFilter, TransactionRecord } from "../contracts/repository/transactionRecords";

export interface ITransactionRepository {
  createTransaction(data: Partial<TransactionDocument>, session?: ClientSession): Promise<TransactionRecord>;
  findByProIdPaginated(proId: string, page: number, limit: number): Promise<{ transactions: TransactionRecord[]; total: number }>;
  findByAdminIdPaginated(adminId: string, page: number, limit: number): Promise<{ transactions: TransactionRecord[]; total: number }>;
  findOneByKeys(filter: FindTransactionByKeysFilter, session?: ClientSession): Promise<TransactionRecord | null>;
}
