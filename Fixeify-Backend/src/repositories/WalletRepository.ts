import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { IWalletRepository } from "./IWalletRepository";
import Wallet, { WalletDocument } from "../models/walletModel";
import { WalletResponseDTO } from "../dtos/response/walletDtos";
import { Types, UpdateQuery } from "mongoose";
import { isValidObjectId } from "mongoose";
import TransactionModel, { TransactionDocument } from "../models/transactionModel";

@injectable()
export class MongoWalletRepository extends BaseRepository<WalletDocument> implements IWalletRepository {
  constructor() {
    super(Wallet);
  }

  async createWallet(walletData: Partial<WalletDocument>): Promise<WalletResponseDTO> {
    const wallet = await this._model.create(walletData);
    const transactions = await this.fetchTransactionsForPro(wallet.proId.toString());
    return this.mapToWalletResponse(wallet, transactions);
  }

  async findWalletByProId(proId: string): Promise<WalletResponseDTO | null> {
    if (!isValidObjectId(proId)) {
      return null;
    }
    let query = this._model.findOne({ proId: proId }); 
    const wallet = await query.exec();
    if (!wallet) {
      query = this._model.findOne({ proId: new Types.ObjectId(proId) }); 
      const walletByObjectId = await query.exec();
      if (!walletByObjectId) return null;
      const transactions = await this.fetchTransactionsForPro(walletByObjectId.proId.toString());
      return this.mapToWalletResponse(walletByObjectId, transactions);
    }
    const transactions = await this.fetchTransactionsForPro(wallet.proId.toString());
    return this.mapToWalletResponse(wallet, transactions);
  }

  async updateWallet(walletId: string, update: Partial<WalletDocument>): Promise<WalletResponseDTO | null> {
    const wallet = await this._model
      .findByIdAndUpdate(walletId, update as UpdateQuery<WalletDocument>, { new: true })
      .exec();
    if (!wallet) return null;
    const transactions = await this.fetchTransactionsForPro(wallet.proId.toString());
    return this.mapToWalletResponse(wallet, transactions);
  }

  async findWalletByProIdAndPagination(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "credit" | "debit",
    search?: string
  ): Promise<{ wallet: WalletResponseDTO | null; total: number }> {
    if (!isValidObjectId(proId)) {
      return { wallet: null, total: 0 };
    }

    let wallet = await this._model.findOne({ proId: proId }).exec();
    if (!wallet) {
      wallet = await this._model.findOne({ proId: new Types.ObjectId(proId) }).exec();
      if (!wallet) return { wallet: null, total: 0 };
    }

    const txFilter: Record<string, unknown> = {
      proId: new Types.ObjectId(wallet.proId),
      $or: [{ adminId: { $exists: false } }, { adminId: null }],
    };

    if (sortBy === "credit" || sortBy === "debit") {
      txFilter.type = sortBy;
    }

    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), "i");
      const amountNumber = Number(search.trim());
      const amountFilter = isNaN(amountNumber) ? [] : [{ amount: amountNumber }];
      txFilter.$and = [
        {
          $or: [
            { transactionId: searchRegex },
            { description: searchRegex },
            ...amountFilter,
          ],
        },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    if (sortBy === "oldest") sort.createdAt = 1;
    else sort.createdAt = -1; 

    const skip = (page - 1) * limit;

    const [total, txDocs] = await Promise.all([
      TransactionModel.countDocuments(txFilter),
      TransactionModel.find(txFilter)
        .populate("quotaId", "quotaId bookingId userId totalCost")
        .populate("bookingId", "_id")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    const transactions = txDocs.map((t: TransactionDocument & {
      quotaId?: { _id?: Types.ObjectId; bookingId?: Types.ObjectId; userId?: Types.ObjectId; totalCost?: number };
      bookingId?: { _id?: Types.ObjectId };
    }) => ({
      _id: t._id.toString(),
      transactionId: t.transactionId,
      amount: t.amount,
      type: t.type,
      date: t.date,
      description: t.description,
      bookingId: t.bookingId ? (t.bookingId._id?.toString?.() || t.bookingId.toString()) : undefined,
      quotaId: t.quotaId
        ? {
            id: t.quotaId._id?.toString() || t.quotaId.toString(),
            bookingId: t.quotaId?.bookingId?.toString() || undefined,
            userId: t.quotaId?.userId?.toString() || undefined,
            totalCost: t.quotaId?.totalCost || undefined,
          }
        : undefined,
    }));

    return { wallet: this.mapToWalletResponse(wallet, transactions), total };
  }

  async decreaseWalletBalance(walletId: string, amount: number): Promise<WalletResponseDTO | null> {
    if (!isValidObjectId(walletId)) {
      return null;
    }
    if (amount <= 0) {
      return null;
    }
    const update: UpdateQuery<WalletDocument> = { $inc: { balance: -amount } };
    const wallet = await this._model
      .findByIdAndUpdate(walletId, update, { new: true })
      .exec();
    if (!wallet) return null;
    const transactions = await this.fetchTransactionsForPro(wallet.proId.toString());
    return this.mapToWalletResponse(wallet, transactions);
  }

  private async fetchTransactionsForPro(proId: string) {
    const txs = await TransactionModel.find({
      proId: new Types.ObjectId(proId),
      $or: [
        { adminId: { $exists: false } },
        { adminId: null }
      ],
    })
      .populate("quotaId", "quotaId bookingId userId totalCost")
      .populate("bookingId", "_id")
      .sort({ createdAt: -1 })
      .exec();
    return txs.map((t: TransactionDocument & {
      quotaId?: { _id?: Types.ObjectId; bookingId?: Types.ObjectId; userId?: Types.ObjectId; totalCost?: number };
      bookingId?: { _id?: Types.ObjectId };
    }) => ({
      _id: t._id.toString(),
      transactionId: t.transactionId,
      amount: t.amount,
      type: t.type,
      date: t.date,
      description: t.description,
      bookingId: t.bookingId ? (t.bookingId._id?.toString?.() || t.bookingId.toString()) : undefined,
      quotaId: t.quotaId
        ? {
            id: t.quotaId._id?.toString() || t.quotaId.toString(),
            bookingId: t.quotaId?.bookingId?.toString() || undefined,
            userId: t.quotaId?.userId?.toString() || undefined,
            totalCost: t.quotaId?.totalCost || undefined,
          }
        : undefined,
    }));
  }

  private mapToWalletResponse(wallet: WalletDocument, transactions: WalletResponseDTO["transactions"]): WalletResponseDTO {
    return {
      id: wallet._id.toString(),
      proId: wallet.proId.toString(),
      balance: wallet.balance,
      transactions,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}