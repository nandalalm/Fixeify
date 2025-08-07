import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { IRatingReview, RatingReview } from "../models/ratingReviewModel";
import { IRatingReviewRepository } from "./IRatingReviewRepository";

import mongoose from "mongoose";

@injectable()
export class MongoRatingReviewRepository
  extends BaseRepository<IRatingReview>
  implements IRatingReviewRepository
{
  constructor() {
    super(RatingReview);
  }

  async create(data: Partial<IRatingReview>): Promise<IRatingReview> {
    const doc = await RatingReview.create(data);
    return (await doc.populate([
      { path: "userId", select: "name email photo" },
      { path: "proId", select: "firstName lastName profilePhoto" },
    ])) as unknown as IRatingReview;
  }

  async findByProId(
    proId: string,
    page: number = 1,
    limit: number = 5
  ): Promise<{ items: IRatingReview[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      RatingReview.find({ proId: new mongoose.Types.ObjectId(proId) })
        .populate({ path: "userId", select: "name email photo" })
        .populate({ path: "proId", select: "firstName lastName profilePhoto" })
        .populate({ path: "categoryId", select: "name image" })
        .populate({ path: "bookingId", select: "issueDescription" })
        
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      RatingReview.countDocuments({ proId: new mongoose.Types.ObjectId(proId) }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 5
  ): Promise<{ items: IRatingReview[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      RatingReview.find({ userId: new mongoose.Types.ObjectId(userId) })
        .populate({ path: "proId", select: "firstName lastName profilePhoto" })
        .populate({ path: "categoryId", select: "name image" })
        .populate({ path: "bookingId", select: "issueDescription" })
        
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      RatingReview.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
    ]);
    return { items, total, page, limit };
  }

  async findAll(
    page: number = 1,
    limit: number = 5
  ): Promise<{ items: IRatingReview[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      RatingReview.find()
        .populate({ path: "userId", select: "name email photo" })
        .populate({ path: "proId", select: "firstName lastName profilePhoto" })
        .populate({ path: "categoryId", select: "name image" })
        .populate({ path: "bookingId", select: "issueDescription" })
        
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      RatingReview.countDocuments(),
    ]);

    return { items, total, page, limit };
  }

  async hasUserReviewedBookingOrQuota(
    userId: string,
    bookingId?: string
  ): Promise<boolean> {
    if (!bookingId) return false;
    const query: any = {
      userId: new mongoose.Types.ObjectId(userId),
      bookingId: new mongoose.Types.ObjectId(bookingId),
    };
    const count = await RatingReview.countDocuments(query);
    return count > 0;
  }
}
