import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import type { IWalletRepository } from "./IWalletRepository";
import Wallet, { type WalletDocument } from "../models/walletModel";
import { type ClientSession, type FilterQuery, Types, type UpdateQuery } from "mongoose";
import { isValidObjectId } from "mongoose";
import TransactionModel, { type TransactionDocument } from "../models/transactionModel";
import type { WalletTransactionRecord, WalletWithTransactionsRecord } from "../contracts/repository/walletRecords";

@injectable()
export class MongoWalletRepository extends BaseRepository<WalletDocument> implements IWalletRepository {
  constructor() {
    super(Wallet);
  }

  async createWallet(walletData: Partial<WalletDocument>, session?: ClientSession): Promise<WalletWithTransactionsRecord> {
    const wallets = await this._model.create([walletData], { session });
    const wallet = wallets[0];
    const transactions = await this.fetchTransactionsForPro(wallet.proId.toString(), session);
    return this.buildWalletRecord(wallet, transactions);
  }

  async findWalletByProId(proId: string, populateQuotas?: boolean, session?: ClientSession): Promise<WalletWithTransactionsRecord | null> {
    if (!isValidObjectId(proId)) {
      return null;
    }
    void populateQuotas;
    let query = this._model.findOne({ proId: proId }).session(session || null);
    const wallet = await query.exec();
    if (!wallet) {
      query = this._model.findOne({ proId: new Types.ObjectId(proId) }).session(session || null);
      const walletByObjectId = await query.exec();
      if (!walletByObjectId) return null;
      const transactions = await this.fetchTransactionsForPro(walletByObjectId.proId.toString(), session);
      return this.buildWalletRecord(walletByObjectId, transactions);
    }
    const transactions = await this.fetchTransactionsForPro(wallet.proId.toString(), session);
    return this.buildWalletRecord(wallet, transactions);
  }

  async updateWallet(walletId: string, update: Partial<WalletDocument>, session?: ClientSession): Promise<WalletWithTransactionsRecord | null> {
    const wallet = await this._model
      .findByIdAndUpdate(walletId, update as UpdateQuery<WalletDocument>, { new: true, session })
      .exec();
    if (!wallet) return null;
    const transactions = await this.fetchTransactionsForPro(wallet.proId.toString(), session);
    return this.buildWalletRecord(wallet, transactions);
  }

  async findWalletByProIdAndPagination(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "credit" | "debit",
    search?: string
  ): Promise<{ wallet: WalletWithTransactionsRecord | null; total: number }> {
    if (!isValidObjectId(proId)) {
      return { wallet: null, total: 0 };
    }

    let wallet = await this._model.findOne({ proId: proId }).exec();
    if (!wallet) {
      wallet = await this._model.findOne({ proId: new Types.ObjectId(proId) }).exec();
      if (!wallet) return { wallet: null, total: 0 };
    }

    const txFilter: FilterQuery<TransactionDocument> = {
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
        .lean<WalletTransactionRecord[]>()
        .exec(),
    ]);

    return { wallet: this.buildWalletRecord(wallet, txDocs), total };
  }

  async decreaseWalletBalance(walletId: string, amount: number, session?: ClientSession): Promise<WalletWithTransactionsRecord | null> {
    if (!isValidObjectId(walletId)) {
      return null;
    }
    if (amount <= 0) {
      return null;
    }
    const update: UpdateQuery<WalletDocument> = { $inc: { balance: -amount } };
    const wallet = await this._model
      .findByIdAndUpdate(walletId, update, { new: true, session })
      .exec();
    if (!wallet) return null;
    const transactions = await this.fetchTransactionsForPro(wallet.proId.toString(), session);
    return this.buildWalletRecord(wallet, transactions);
  }

  private async fetchTransactionsForPro(proId: string, session?: ClientSession): Promise<WalletTransactionRecord[]> {
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
      .session(session || null)
      .lean<WalletTransactionRecord[]>()
      .exec();
    return txs;
  }

  private buildWalletRecord(wallet: WalletDocument, transactions: WalletTransactionRecord[]): WalletWithTransactionsRecord {
    return {
      _id: wallet._id,
      proId: wallet.proId,
      balance: wallet.balance,
      transactions,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}
