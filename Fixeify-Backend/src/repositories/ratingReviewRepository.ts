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
      { path: "userId", select: "name email phoneNo photo" },
      { path: "proId", select: "firstName lastName email phoneNumber profilePhoto" },
      { path: "categoryId", select: "name image" },
      { path: "bookingId", select: "issueDescription" },
    ])) as unknown as IRatingReview;
  }

  async findById(id: string): Promise<IRatingReview | null> {
    return RatingReview.findById(id)
      .populate({ path: "userId", select: "name email phoneNo photo" })
      .populate({ path: "proId", select: "firstName lastName email phoneNumber profilePhoto" })
      .populate({ path: "categoryId", select: "name image" })
      .populate({ path: "bookingId", select: "issueDescription" })
      .exec();
  }

  async findByProId(
    proId: string,
    page: number = 1,
    limit: number = 5,
    sortBy?: "latest" | "oldest" | "lowest" | "highest",
    search?: string
  ): Promise<{ items: IRatingReview[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === "oldest") sort = { createdAt: 1 };
    else if (sortBy === "lowest") sort = { rating: 1, createdAt: -1 };
    else if (sortBy === "highest") sort = { rating: -1, createdAt: -1 };

    const matchStage: Record<string, mongoose.Types.ObjectId> = { proId: new mongoose.Types.ObjectId(proId) };

    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "approvedpros",
          localField: "proId",
          foreignField: "_id",
          as: "proId",
        },
      },
      { $unwind: { path: "$proId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryId",
        },
      },
      { $unwind: { path: "$categoryId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "bookingId",
        },
      },
      { $unwind: { path: "$bookingId", preserveNullAndEmptyArrays: true } },
    ];

    if (search && search.trim().length > 0) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      pipeline.push({
        $match: {
          $or: [
            { "userId.name": { $regex: regex } },
            { "bookingId.issueDescription": { $regex: regex } },
            { "categoryId.name": { $regex: regex } },
          ],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: "total" }];

    pipeline.push({ $sort: sort }, { $skip: skip }, { $limit: limit });

    const [itemsAgg, totalAgg] = await Promise.all([
      RatingReview.aggregate(pipeline),
      RatingReview.aggregate(countPipeline),
    ]);

    const total = totalAgg[0]?.total || 0;

    return { items: itemsAgg as unknown as IRatingReview[], total, page, limit };
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 5
  ): Promise<{ items: IRatingReview[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      RatingReview.find({ userId: new mongoose.Types.ObjectId(userId) })
        .populate({ path: "userId", select: "name email phoneNo photo" })
        .populate({ path: "proId", select: "firstName lastName email phoneNumber profilePhoto" })
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
    limit: number = 5,
    sortBy?: "latest" | "oldest" | "lowest" | "highest",
    search?: string
  ): Promise<{ items: IRatingReview[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    let sort: Record<string, 1 | -1> = { createdAt: -1 }; 
    if (sortBy === "oldest") sort = { createdAt: 1 };
    else if (sortBy === "lowest") sort = { rating: 1, createdAt: -1 };
    else if (sortBy === "highest") sort = { rating: -1, createdAt: -1 };

    const pipeline: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "approvedpros",
          localField: "proId",
          foreignField: "_id",
          as: "proId",
        },
      },
      { $unwind: { path: "$proId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryId",
        },
      },
      { $unwind: { path: "$categoryId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "bookingId",
        },
      },
      { $unwind: { path: "$bookingId", preserveNullAndEmptyArrays: true } },
    ];

    if (search && search.trim().length > 0) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      pipeline.push({
        $match: {
          $or: [
            { "userId.name": { $regex: regex } },
            { "proId.firstName": { $regex: regex } },
            { "proId.lastName": { $regex: regex } },
            { "categoryId.name": { $regex: regex } },
          ],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: "total" }];

    pipeline.push({ $sort: sort }, { $skip: skip }, { $limit: limit });

    const [itemsAgg, totalAgg] = await Promise.all([
      RatingReview.aggregate(pipeline),
      RatingReview.aggregate(countPipeline),
    ]);

    const total = totalAgg[0]?.total || 0;
    return { items: itemsAgg as unknown as IRatingReview[], total, page, limit };
  }

  async hasUserReviewedBookingOrQuota(
    userId: string,
    bookingId?: string
  ): Promise<boolean> {
    if (!bookingId) return false;
    const query: Record<string, mongoose.Types.ObjectId> = {
      userId: new mongoose.Types.ObjectId(userId),
      bookingId: new mongoose.Types.ObjectId(bookingId),
    };
    const count = await RatingReview.countDocuments(query);
    return count > 0;
  }
}
