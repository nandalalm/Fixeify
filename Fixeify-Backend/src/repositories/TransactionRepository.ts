import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import TransactionModel, { TransactionDocument } from "../models/transactionModel";
import { ITransactionRepository, TransactionResponseDTO } from "./ITransactionRepository";
import { Types } from "mongoose";

@injectable()
export class MongoTransactionRepository extends BaseRepository<TransactionDocument> implements ITransactionRepository {
  constructor() {
    super(TransactionModel);
  }

  async createTransaction(data: Partial<TransactionDocument>): Promise<TransactionResponseDTO> {
    const created = await this._model.create(data);
    return this.map(created);
  }

  async findByProIdPaginated(proId: string, page: number, limit: number): Promise<{ transactions: TransactionResponseDTO[]; total: number }> {
    const p = Math.max(1, page || 1);
    const l = Math.max(1, limit || 5);
    const skip = (p - 1) * l;

    const query = { proId: new Types.ObjectId(proId) };
    const [docs, total] = await Promise.all([
      this._model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .exec(),
      this._model.countDocuments(query)
    ]);

    return { transactions: docs.map(this.map), total };
  }

  async findByAdminIdPaginated(adminId: string, page: number, limit: number): Promise<{ transactions: TransactionResponseDTO[]; total: number }> {
    const p = Math.max(1, page || 1);
    const l = Math.max(1, limit || 5);
    const skip = (p - 1) * l;

    const query = { adminId: new Types.ObjectId(adminId) } as any;
    const [docs, total] = await Promise.all([
      this._model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .exec(),
      this._model.countDocuments(query)
    ]);

    return { transactions: docs.map(this.map), total };
  }

  private map = (doc: TransactionDocument): TransactionResponseDTO => ({
    id: doc._id.toString(),
    proId: doc.proId.toString(),
    walletId: doc.walletId ? doc.walletId.toString() : undefined,
    amount: doc.amount,
    type: doc.type,
    date: doc.date,
    description: doc.description,
    bookingId: doc.bookingId ? doc.bookingId.toString() : undefined,
    quotaId: doc.quotaId ? doc.quotaId.toString() : undefined,
    adminId: (doc as any).adminId ? (doc as any).adminId.toString() : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
