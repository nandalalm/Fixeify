import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import type { IQuotaRepository } from "./IQuotaRepository";
import Quota, { type QuotaDocument } from "../models/quotaModel";
import { type ClientSession, Types } from "mongoose";
import Booking from "../models/bookingModel";
import type { PopulatedQuotaRecord } from "../contracts/repository/quotaRecords";

@injectable()
export class MongoQuotaRepository extends BaseRepository<QuotaDocument> implements IQuotaRepository {
  constructor() {
    super(Quota);
  }

  async createQuota(quotaData: Partial<QuotaDocument>): Promise<PopulatedQuotaRecord> {
    const quota = await this._model
      .create(quotaData)
      .then((doc) =>
        doc.populate([
          { path: "userId", select: "name email" },
          { path: "proId", select: "firstName lastName" },
          { path: "categoryId", select: "name image" },
        ])
      ) as PopulatedQuotaRecord;

    return quota;
  }

  async findQuotaByBookingId(bookingId: string, session?: ClientSession): Promise<PopulatedQuotaRecord | null> {
    let bookingObjectId: Types.ObjectId | null = null;
    if (Types.ObjectId.isValid(bookingId)) {
      bookingObjectId = new Types.ObjectId(bookingId);
    } else {
      const bookingDoc = await Booking.findOne({ bookingId }).select("_id").session(session || null).lean();
      if (bookingDoc?._id) bookingObjectId = bookingDoc._id as Types.ObjectId;
    }

    if (!bookingObjectId) return null;

    const quota = await this._model
      .findOne({ bookingId: bookingObjectId })
      .populate([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .session(session || null)
      .exec() as PopulatedQuotaRecord | null;

    return quota;
  }

  async updateQuota(quotaId: string, data: Partial<QuotaDocument>, session?: ClientSession): Promise<PopulatedQuotaRecord | null> {
    const quota = await this._model
      .findByIdAndUpdate(quotaId, data, { new: true, session })
      .populate([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .exec() as PopulatedQuotaRecord | null;

    return quota;
  }

  async markPaymentCompletedIfPending(quotaId: string, session?: ClientSession): Promise<PopulatedQuotaRecord | null> {
    const quota = await this._model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(quotaId), paymentStatus: "pending" },
        { $set: { paymentStatus: "completed" } },
        { new: true, session }
      )
      .populate([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .exec() as PopulatedQuotaRecord | null;

    return quota;
  }
}
