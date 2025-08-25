import { WalletDocument } from "../models/walletModel";
import { WalletResponseDTO } from "../dtos/response/walletDtos";

export interface IWalletRepository {
  createWallet(walletData: Partial<WalletDocument>): Promise<WalletResponseDTO>;
  findWalletByProId(proId: string, populateQuotas?: boolean): Promise<WalletResponseDTO | null>;
  updateWallet(walletId: string, data: Partial<WalletDocument>): Promise<WalletResponseDTO | null>;
  findWalletByProIdAndPagination(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "credit" | "debit",
    search?: string
  ): Promise<{ wallet: WalletResponseDTO | null; total: number }>;
  decreaseWalletBalance(walletId: string, amount: number): Promise<WalletResponseDTO | null>;
}