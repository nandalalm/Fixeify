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

  async findOneByKeys(filter: { bookingId: string; type: "credit" | "debit"; proId: string; amount: number; adminId?: string }): Promise<TransactionResponseDTO | null> {
    const query: Record<string, Types.ObjectId | string | number> = {
      bookingId: new Types.ObjectId(filter.bookingId),
      type: filter.type,
      proId: new Types.ObjectId(filter.proId),
      amount: filter.amount,
    };
    if (filter.adminId) {
      query.adminId = new Types.ObjectId(filter.adminId);
    }
    const doc = await TransactionModel.findOne(query).exec();
    return doc ? this.map(doc) : null;
  }

  async createTransaction(data: Partial<TransactionDocument>): Promise<TransactionResponseDTO> {
    try {
      const created = await this._model.create(data);
      return this.map(created);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
        const existing = await this.findOneByKeys({
          bookingId: data.bookingId!.toString(),
          type: data.type as "credit" | "debit",
          proId: data.proId!.toString(),
          amount: data.amount!,
          adminId: data.adminId?.toString()
        });
        if (existing) return existing;
      }
      throw error;
    }
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

    const query: Record<string, Types.ObjectId> = { adminId: new Types.ObjectId(adminId) };
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
    transactionId: doc.transactionId,
    proId: doc.proId.toString(),
    walletId: doc.walletId ? doc.walletId.toString() : undefined,
    amount: doc.amount,
    type: doc.type,
    date: doc.date,
    description: doc.description,
    bookingId: doc.bookingId ? doc.bookingId.toString() : undefined,
    quotaId: doc.quotaId ? doc.quotaId.toString() : undefined,
    adminId: doc.adminId ? doc.adminId.toString() : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}

