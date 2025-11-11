import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { IQuotaRepository, PopulatedQuotaDocument } from "./IQuotaRepository";
import Quota, { QuotaDocument } from "../models/quotaModel";
import { QuotaResponse } from "../dtos/response/quotaDtos";
import { Types } from "mongoose";
import Booking from "../models/bookingModel";

@injectable()
export class MongoQuotaRepository extends BaseRepository<QuotaDocument> implements IQuotaRepository {
  constructor() {
    super(Quota);
  }

  async createQuota(quotaData: Partial<QuotaDocument>): Promise<QuotaResponse> {
    const quota = await this._model
      .create(quotaData)
      .then((doc) =>
        doc.populate([
          { path: "userId", select: "name email" },
          { path: "proId", select: "firstName lastName" },
          { path: "categoryId", select: "name image" },
        ])
      ) as PopulatedQuotaDocument;

    return this.mapToQuotaResponse(quota);
  }

  async findQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null> {
    let bookingObjectId: Types.ObjectId | null = null;
    if (Types.ObjectId.isValid(bookingId)) {
      bookingObjectId = new Types.ObjectId(bookingId);
    } else {
      const bookingDoc = await Booking.findOne({ bookingId }).select("_id").lean();
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
      .exec() as PopulatedQuotaDocument | null;

    return quota ? this.mapToQuotaResponse(quota) : null;
  }

  async updateQuota(quotaId: string, data: Partial<QuotaDocument>): Promise<QuotaResponse | null> {
    const quota = await this._model
      .findByIdAndUpdate(quotaId, data, { new: true })
      .populate([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .exec() as PopulatedQuotaDocument | null;

    return quota ? this.mapToQuotaResponse(quota) : null;
  }

  async markPaymentCompletedIfPending(quotaId: string): Promise<QuotaResponse | null> {
    const quota = await this._model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(quotaId), paymentStatus: "pending" },
        { $set: { paymentStatus: "completed" } },
        { new: true }
      )
      .populate([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .exec() as PopulatedQuotaDocument | null;

    return quota ? this.mapToQuotaResponse(quota) : null;
  }

  private mapToQuotaResponse(quota: PopulatedQuotaDocument): QuotaResponse {
    return new QuotaResponse({
      id: quota._id.toString(),
      user: {
        id: quota.userId._id.toString(),
        name: quota.userId.name,
        email: quota.userId.email,
      },
      pro: {
        id: quota.proId._id.toString(),
        firstName: quota.proId.firstName,
        lastName: quota.proId.lastName,
      },
      bookingId: quota.bookingId.toString(),
      category: {
        id: quota.categoryId._id.toString(),
        name: quota.categoryId.name,
        image: quota.categoryId.image,
      },
      laborCost: quota.laborCost,
      materialCost: quota.materialCost,
      additionalCharges: quota.additionalCharges,
      totalCost: quota.totalCost,
      paymentStatus: quota.paymentStatus,
      paymentIntentId: (quota as unknown as Record<string, unknown>).paymentIntentId as string,
      createdAt: quota.createdAt,
      updatedAt: quota.updatedAt,
    });
  }
}