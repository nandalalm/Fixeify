import type { ClientSession } from "mongoose";
import type { WalletDocument } from "../models/walletModel";
import type { WalletWithTransactionsRecord } from "../contracts/repository/walletRecords";

export interface IWalletRepository {
  createWallet(walletData: Partial<WalletDocument>, session?: ClientSession): Promise<WalletWithTransactionsRecord>;
  findWalletByProId(proId: string, populateQuotas?: boolean, session?: ClientSession): Promise<WalletWithTransactionsRecord | null>;
  updateWallet(walletId: string, data: Partial<WalletDocument>, session?: ClientSession): Promise<WalletWithTransactionsRecord | null>;
  findWalletByProIdAndPagination(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "credit" | "debit",
    search?: string
  ): Promise<{ wallet: WalletWithTransactionsRecord | null; total: number }>;
  decreaseWalletBalance(walletId: string, amount: number, session?: ClientSession): Promise<WalletWithTransactionsRecord | null>;
}
