import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { IWalletRepository } from "./IWalletRepository";
import Wallet, { WalletDocument } from "../models/walletModel";
import { WalletResponseDTO } from "../dtos/response/walletDtos";
import { Types, UpdateQuery } from "mongoose";
import { isValidObjectId } from "mongoose";

@injectable()
export class MongoWalletRepository extends BaseRepository<WalletDocument> implements IWalletRepository {
  constructor() {
    super(Wallet);
  }

  async createWallet(walletData: Partial<WalletDocument>): Promise<WalletResponseDTO> {
    const wallet = await this._model.create(walletData);
    return this.mapToWalletResponse(wallet);
  }

  async findWalletByProId(proId: string, populateQuotas: boolean = true): Promise<WalletResponseDTO | null> {
    if (!isValidObjectId(proId)) {
      console.error("Invalid proId format:", proId);
      return null;
    }
    let query = this._model.findOne({ proId: proId }); 
    if (populateQuotas) {
      query = query.populate("transactions.quotaId", "quotaId bookingId userId totalCost");
    }
    const wallet = await query.exec();
    if (!wallet) {
      query = this._model.findOne({ proId: new Types.ObjectId(proId) }); 
      if (populateQuotas) {
        query = query.populate("transactions.quotaId", "quotaId bookingId userId totalCost");
      }
      const walletByObjectId = await query.exec();
      return walletByObjectId ? this.mapToWalletResponse(walletByObjectId) : null;
    }
    return this.mapToWalletResponse(wallet);
  }

  async updateWallet(walletId: string, update: Partial<WalletDocument>): Promise<WalletResponseDTO | null> {
    const wallet = await this._model
      .findByIdAndUpdate(walletId, update, { new: true })
      .populate("transactions.quotaId", "quotaId bookingId userId totalCost") 
      .exec();
    return wallet ? this.mapToWalletResponse(wallet) : null;
  }

  async findWalletByProIdAndPagination(proId: string, page: number, limit: number, populateQuotas: boolean = true): Promise<{ wallet: WalletResponseDTO | null; total: number }> {
    if (!isValidObjectId(proId)) {
      console.error("Invalid proId format:", proId);
      return { wallet: null, total: 0 };
    }
    const total = await this._model.countDocuments({ proId });
    let query = this._model.findOne({ proId: proId }).skip((page - 1) * limit).limit(limit);
    if (populateQuotas) {
      query = query.populate("transactions.quotaId", "quotaId bookingId userId totalCost");
    }
    const wallet = await query.exec();
    if (!wallet) {
      query = this._model.findOne({ proId: new Types.ObjectId(proId) }).skip((page - 1) * limit).limit(limit);
      if (populateQuotas) {
        query = query.populate("transactions.quotaId", "quotaId bookingId userId totalCost");
      }
      const walletByObjectId = await query.exec();
      return { wallet: walletByObjectId ? this.mapToWalletResponse(walletByObjectId) : null, total };
    }
    return { wallet: this.mapToWalletResponse(wallet), total };
  }

  async decreaseWalletBalance(walletId: string, amount: number): Promise<WalletResponseDTO | null> {
    if (!isValidObjectId(walletId)) {
      console.error("Invalid walletId format:", walletId);
      return null;
    }
    if (amount <= 0) {
      console.error("Amount must be positive:", amount);
      return null;
    }
    const update: UpdateQuery<WalletDocument> = {
      $inc: { balance: -amount },
      $push: {
        transactions: {
          amount,
          type: "debit",
          date: new Date(),
        },
      },
    };
    const wallet = await this._model
      .findByIdAndUpdate(walletId, update, { new: true })
      .populate("transactions.quotaId", "quotaId bookingId userId totalCost")
      .exec();
    return wallet ? this.mapToWalletResponse(wallet) : null;
  }

  private mapToWalletResponse(wallet: WalletDocument): WalletResponseDTO {
    return {
      id: wallet._id.toString(),
      proId: wallet.proId.toString(),
      balance: wallet.balance,
      transactions: wallet.transactions.map(t => ({
        _id: t._id.toString(),
        amount: t.amount,
        type: t.type,
        date: t.date,
        quotaId: t.quotaId ? {
          id: t.quotaId._id?.toString() || t.quotaId.toString(),
          bookingId: (t.quotaId as any)?.bookingId?.toString() || undefined,
          userId: (t.quotaId as any)?.userId?.toString() || undefined,
          totalCost: (t.quotaId as any)?.totalCost || undefined,
        } : undefined,
      })),
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}