import type { TransactionResponse } from "../dtos/response/transactionDtos";
import type { TransactionRecord } from "../contracts/repository/transactionRecords";

export const toTransactionResponse = (transaction: TransactionRecord): TransactionResponse => ({
  id: transaction._id.toString(),
  transactionId: transaction.transactionId,
  proId: transaction.proId.toString(),
  walletId: transaction.walletId ? transaction.walletId.toString() : undefined,
  amount: transaction.amount,
  type: transaction.type,
  date: transaction.date,
  description: transaction.description,
  bookingId: transaction.bookingId ? transaction.bookingId.toString() : undefined,
  quotaId: transaction.quotaId ? transaction.quotaId.toString() : undefined,
  adminId: transaction.adminId ? transaction.adminId.toString() : undefined,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});
