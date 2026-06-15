import type { WalletResponse } from "../dtos/response/walletDtos";
import type { WalletTransactionRecord, WalletWithTransactionsRecord } from "../contracts/repository/walletRecords";

const toBookingIdResponse = (bookingId: WalletTransactionRecord["bookingId"]): string | undefined => {
  if (!bookingId) return undefined;
  return ("_id" in bookingId ? bookingId._id : bookingId).toString();
};

const toQuotaIdResponse = (quotaId: WalletTransactionRecord["quotaId"]): WalletResponse["transactions"][number]["quotaId"] => {
  if (!quotaId) return undefined;
  if ("totalCost" in quotaId || "bookingId" in quotaId || "userId" in quotaId) {
    return {
      id: quotaId._id.toString(),
      bookingId: quotaId.bookingId?.toString(),
      userId: quotaId.userId?.toString(),
      totalCost: quotaId.totalCost,
    };
  }
  return { id: quotaId.toString() };
};

export const toWalletResponse = (wallet: WalletWithTransactionsRecord): WalletResponse => ({
  id: wallet._id.toString(),
  proId: wallet.proId.toString(),
  balance: wallet.balance,
  transactions: wallet.transactions.map((transaction) => ({
    _id: transaction._id.toString(),
    transactionId: transaction.transactionId,
    amount: transaction.amount,
    type: transaction.type,
    date: transaction.date,
    description: transaction.description,
    bookingId: toBookingIdResponse(transaction.bookingId),
    quotaId: toQuotaIdResponse(transaction.quotaId),
  })),
  createdAt: wallet.createdAt,
  updatedAt: wallet.updatedAt,
});
