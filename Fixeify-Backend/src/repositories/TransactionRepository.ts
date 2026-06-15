import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import TransactionModel, { type TransactionDocument } from "../models/transactionModel";
import type { ITransactionRepository } from "./ITransactionRepository";
import { type ClientSession, Types } from "mongoose";
import type { FindTransactionByKeysFilter, TransactionRecord } from "../contracts/repository/transactionRecords";

@injectable()
export class MongoTransactionRepository extends BaseRepository<TransactionDocument> implements ITransactionRepository {
  constructor() {
    super(TransactionModel);
  }

  async findOneByKeys(filter: FindTransactionByKeysFilter, session?: ClientSession): Promise<TransactionRecord | null> {
    const query: Record<string, Types.ObjectId | string | number> = {
      bookingId: new Types.ObjectId(filter.bookingId),
      type: filter.type,
      proId: new Types.ObjectId(filter.proId),
      amount: filter.amount,
    };
    if (filter.adminId) {
      query.adminId = new Types.ObjectId(filter.adminId);
    }
    const doc = await TransactionModel.findOne(query).session(session || null).exec();
    return doc;
  }

  async createTransaction(data: Partial<TransactionDocument>, session?: ClientSession): Promise<TransactionRecord> {
    try {
      const createdTransactions = await this._model.create([data], { session });
      return createdTransactions[0];
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
        const existing = await this.findOneByKeys({
          bookingId: data.bookingId!.toString(),
          type: data.type as "credit" | "debit",
          proId: data.proId!.toString(),
          amount: data.amount!,
          adminId: data.adminId?.toString()
        }, session);
        if (existing) return existing;
      }
      throw error;
    }
  }

  async findByProIdPaginated(proId: string, page: number, limit: number): Promise<{ transactions: TransactionRecord[]; total: number }> {
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

    return { transactions: docs, total };
  }

  async findByAdminIdPaginated(adminId: string, page: number, limit: number): Promise<{ transactions: TransactionRecord[]; total: number }> {
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

    return { transactions: docs, total };
  }
}
