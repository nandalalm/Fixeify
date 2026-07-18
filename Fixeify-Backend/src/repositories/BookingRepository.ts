import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import type { IBookingRepository } from "./IBookingRepository";
import Booking, { type BookingDocument } from "../models/bookingModel";
import mongoose, { type ClientSession, type FilterQuery } from "mongoose";
import { MESSAGES } from "../constants/messages";
import type { BookingTimeSlot } from "../contracts/api/bookingTypes";
import type {
  BookingCompleteRecord,
  BookingConflictQueryRecord,
  BookingListProjectionRecord,
  PopulatedBookingCategoryRecord,
  PopulatedBookingProRecord,
  PopulatedBookingRecord,
  PopulatedBookingUserRecord,
} from "../contracts/repository/bookingRecords";


@injectable()
export class MongoBookingRepository extends BaseRepository<BookingDocument> implements IBookingRepository {
  constructor() {
    super(Booking);
  }

  async createBooking(bookingData: Partial<BookingDocument>, session?: ClientSession): Promise<PopulatedBookingRecord> {
    const createdBookings = await this._model.create([bookingData], { session });
    const booking = await this._model
      .findById(createdBookings[0]._id)
      .session(session || null)
      .populate([
        { path: "userId", select: "name email photo" },
        { path: "proId", select: "firstName lastName profilePhoto" },
        { path: "categoryId", select: "name image" },
      ])
      .exec() as PopulatedBookingRecord | null;

    if (!booking) {
      throw new Error(MESSAGES.BOOKING_NOT_FOUND_AFTER_CREATION);
    }

    return booking;
  }

  async fetchBookingDetails(
    userId: string,
    page: number = 1,
    limit: number = 5,
    search?: string,
    status?: string,
    sortBy: "latest" | "oldest" = "latest",
    bookingId?: string
  ): Promise<{ bookings: BookingListProjectionRecord[]; total: number }> {
    const skip = (page - 1) * limit;

    const query: FilterQuery<BookingDocument> = { userId: new mongoose.Types.ObjectId(userId) };

    if (status && status.trim().length > 0) {
      const statusArray = status.split(",").map((s) => s.trim());
      query.status = statusArray.length > 1 ? { $in: statusArray } : statusArray[0];
    } else {
      query.status = { $in: ["pending", "accepted"] };
    }

    const orClauses: FilterQuery<BookingDocument>[] = [];
    if (search && search.trim().length > 0) {
      orClauses.push(
        { issueDescription: { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
        { bookingId: { $regex: search, $options: "i" } }
      );
    }
    if (bookingId && bookingId.trim().length > 0) {
      const escaped = bookingId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      orClauses.push({ bookingId: { $regex: `${escaped}`, $options: "i" } });
    }
    if (orClauses.length > 0) {
      query.$or = orClauses;
    }

    const sort: Record<string, 1 | -1> = { createdAt: sortBy === "oldest" ? 1 : -1, _id: sortBy === "oldest" ? 1 : -1 };

    const bookings = await this._model
      .find(query)
      .populate<{ userId: PopulatedBookingUserRecord; proId: PopulatedBookingProRecord; categoryId: PopulatedBookingCategoryRecord }>([
        { path: "userId", select: "name email photo" },
        { path: "proId", select: "firstName lastName profilePhoto" },
        { path: "categoryId", select: "name image" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean<BookingListProjectionRecord[]>()
      .exec();

    const total = await this._model.countDocuments(query).exec();
    return { bookings, total };
  }

  async fetchBookingHistoryDetails(
    userId: string,
    page: number = 1,
    limit: number = 5,
    search?: string,
    status?: string,
    sortBy: "latest" | "oldest" = "latest",
    bookingId?: string
  ): Promise<{ bookings: BookingListProjectionRecord[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: FilterQuery<BookingDocument> = { userId: new mongoose.Types.ObjectId(userId) };

    const historyStatuses = ["completed", "rejected", "cancelled", "failed"];
    if (status && status.trim().length > 0) {
      const statusArray = status.split(",").map((s) => s.trim());
      query.status = statusArray.length > 1 ? { $in: statusArray } : statusArray[0];
    } else {
      query.status = { $in: historyStatuses };
    }

    const orClauses: FilterQuery<BookingDocument>[] = [];
    if (search && search.trim().length > 0) {
      orClauses.push(
        { issueDescription: { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
        { bookingId: { $regex: search, $options: "i" } }
      );
    }
    if (bookingId && bookingId.trim().length > 0) {
      const escaped = bookingId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      orClauses.push({ bookingId: { $regex: `${escaped}`, $options: "i" } });
    }
    if (orClauses.length > 0) {
      query.$or = orClauses;
    }

    const sort: Record<string, 1 | -1> = { createdAt: sortBy === "oldest" ? 1 : -1, _id: sortBy === "oldest" ? 1 : -1 };

    const bookings = await this._model
      .find(query)
      .populate<{ userId: PopulatedBookingUserRecord; proId: PopulatedBookingProRecord; categoryId: PopulatedBookingCategoryRecord }>([
        { path: "userId", select: "name email photo" },
        { path: "proId", select: "firstName lastName profilePhoto" },
        { path: "categoryId", select: "name image" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean<BookingListProjectionRecord[]>()
      .exec();

    const total = await this._model.countDocuments(query).exec();
    return { bookings, total };
  }

  async fetchProBookings(
    proId: string,
    page: number = 1,
    limit: number = 5,
    status?: string,
    sortBy: "latest" | "oldest" = "latest",
    search?: string,
    bookingId?: string
  ): Promise<{ bookings: BookingListProjectionRecord[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: FilterQuery<BookingDocument> = { proId: new mongoose.Types.ObjectId(proId) };
    if (status) {
      const statusArray = status.split(",").map(s => s.trim());
      if (statusArray.length > 1) {
        query.status = { $in: statusArray };
      } else {
        query.status = statusArray[0];
      }
    }

    const orClauses: FilterQuery<BookingDocument>[] = [];
    if (search) {
      orClauses.push(
        { issueDescription: { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
        { bookingId: { $regex: search, $options: "i" } }
      );
    }
    if (bookingId) {
      const escaped = bookingId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      orClauses.push({ bookingId: { $regex: `${escaped}`, $options: "i" } });
    }
    if (orClauses.length > 0) {
      query.$or = orClauses;
    }

    const sort: Record<string, 1 | -1> = {};
    sort.createdAt = sortBy === "oldest" ? 1 : -1;
    (sort as Record<string, 1 | -1>)._id = sortBy === "oldest" ? 1 : -1;
    const bookings = await this._model
      .find(query)
      .populate<{ userId: PopulatedBookingUserRecord; proId: PopulatedBookingProRecord; categoryId: PopulatedBookingCategoryRecord }>([
        { path: "userId", select: "name email photo" },
        { path: "proId", select: "firstName lastName profilePhoto" },
        { path: "categoryId", select: "name image" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean<BookingListProjectionRecord[]>()
      .exec();

    const total = await this._model.countDocuments(query).exec();
    return { bookings, total };
  }

  async fetchAllBookings(page: number = 1, limit: number = 5, search?: string, status?: string, sortBy: "latest" | "oldest" = "latest", bookingId?: string): Promise<{ bookings: BookingListProjectionRecord[]; total: number }> {
    const skip = (page - 1) * limit;


    const query: FilterQuery<BookingDocument> = {};

    if (status) {
      query.status = status;
    }

    const orClauses: FilterQuery<BookingDocument>[] = [];
    if (search) {
      orClauses.push(
        { issueDescription: { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
        { bookingId: { $regex: search, $options: "i" } }
      );
    }
    if (bookingId) {
      const escaped = bookingId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      orClauses.push({ bookingId: { $regex: `${escaped}`, $options: "i" } });
    }
    if (orClauses.length > 0) {
      query.$or = orClauses;
    }

    const sort: Record<string, 1 | -1> = {};
    if (sortBy === "latest") {
      sort.createdAt = -1;
      (sort as Record<string, 1 | -1>)._id = -1;
    } else if (sortBy === "oldest") {
      sort.createdAt = 1;
      (sort as Record<string, 1 | -1>)._id = 1;
    }

    const bookings = await this._model
      .find(query)
      .populate<{ userId: PopulatedBookingUserRecord; proId: PopulatedBookingProRecord; categoryId: PopulatedBookingCategoryRecord }>([
        { path: "userId", select: "name email photo" },
        { path: "proId", select: "firstName lastName profilePhoto" },
        { path: "categoryId", select: "name image" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean<BookingListProjectionRecord[]>()
      .exec();

    const total = await this._model.countDocuments(query).exec();
    return { bookings, total };
  }

  async updateBooking(bookingId: string, updateData: Partial<BookingDocument>, session?: ClientSession): Promise<BookingDocument | null> {
    return this._model.findByIdAndUpdate(bookingId, updateData, { new: true, session }).exec();
  }

  async findBookingById(bookingId: string, session?: ClientSession): Promise<BookingDocument | null> {
    return this._model.findById(bookingId).session(session || null).exec();
  }

  async findBookingByIdPopulated(bookingId: string): Promise<PopulatedBookingRecord | null> {
    const booking = await this._model
      .findById(bookingId)
      .populate<{ userId: PopulatedBookingUserRecord; proId: PopulatedBookingProRecord; categoryId: PopulatedBookingCategoryRecord }>([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .lean<PopulatedBookingRecord | null>()
      .exec();

    return booking;
  }

  async findBookingByIdComplete(bookingId: string): Promise<BookingCompleteRecord | null> {
    const isObjectId = mongoose.Types.ObjectId.isValid(bookingId);
    const query = isObjectId ? { _id: new mongoose.Types.ObjectId(bookingId) } : { bookingId };
    const booking = await this._model
      .findOne(query)
      .populate<{ userId: PopulatedBookingUserRecord; proId: PopulatedBookingProRecord; categoryId: PopulatedBookingCategoryRecord }>([
        { path: "userId", select: "name email photo" },
        { path: "proId", select: "firstName lastName profilePhoto email phoneNumber" },
        { path: "categoryId", select: "name image" },
      ])
      .lean<BookingCompleteRecord | null>()
      .exec();

    return booking;
  }

  async cancelBooking(bookingId: string, updateData: { status: string; cancelReason: string }): Promise<void> {
    await this._model.findByIdAndUpdate(bookingId, updateData, { new: true }).exec();
  }

  async findBookingsByProAndDate(
    proId: string,
    preferredDate: Date,
    timeSlots: BookingTimeSlot[],
    status: string,
    excludeBookingId?: string,
    session?: ClientSession
  ): Promise<BookingConflictQueryRecord[]> {
    const startOfDay = new Date(preferredDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(preferredDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query: FilterQuery<BookingDocument> = {
      proId: new mongoose.Types.ObjectId(proId),
      preferredDate: { $gte: startOfDay, $lte: endOfDay },
      status,
      preferredTime: {
        $elemMatch: {
          $or: timeSlots.map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        },
      },
    };

    if (excludeBookingId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
    }

    const bookings = await this._model
      .find(query)
      .session(session || null)
      .lean<BookingConflictQueryRecord[]>()
      .exec();

    return bookings;
  }

  async findBookingsByUserProDateTime(
    userId: string,
    proId: string,
    preferredDate: Date,
    timeSlots: BookingTimeSlot[],
    status: string,
    session?: ClientSession
  ): Promise<BookingConflictQueryRecord[]> {
    const startOfDay = new Date(preferredDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(preferredDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query: FilterQuery<BookingDocument> = {
      userId: new mongoose.Types.ObjectId(userId),
      proId: new mongoose.Types.ObjectId(proId),
      preferredDate: { $gte: startOfDay, $lte: endOfDay },
      status,
      preferredTime: {
        $elemMatch: {
          $or: timeSlots.map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        },
      },
    };

    return await this._model.find(query).session(session || null).lean<BookingConflictQueryRecord[]>().exec();
  }

  async getTrendingService(): Promise<{ categoryId: string; name: string; bookingCount: number } | null> {
    const result = await this._model
      .aggregate([
        {
          $match: {
            status: { $in: ["accepted", "completed"] },
          },
        },
        {
          $group: {
            _id: "$categoryId",
            bookingCount: { $sum: 1 },
          },
        },
        {
          $sort: { bookingCount: -1 },
        },
        {
          $limit: 1,
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: "$category",
        },
        {
          $project: {
            categoryId: "$_id",
            name: "$category.name",
            bookingCount: 1,
            _id: 0,
          },
        },
      ])
      .exec();

    return result.length > 0 ? result[0] : null;
  }

  async getTopCategoriesByCompleted(limit: number): Promise<Array<{ categoryId: string; name: string; image?: string; bookingCount: number }>> {
    const lim = Math.max(1, Math.min(limit || 2, 10));
    const result = await this._model
      .aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: "$categoryId", bookingCount: { $sum: 1 } } },
        { $sort: { bookingCount: -1 } },
        { $limit: lim },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $project: {
            categoryId: "$_id",
            name: "$category.name",
            image: "$category.image",
            bookingCount: 1,
            _id: 0,
          },
        },
      ])
      .exec();
    return (result as Array<{ categoryId: string; name: string; image?: string; bookingCount: number }>);
  }

  async getAdminRevenueMetrics(): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    dailyRevenue: number;
    monthlyDeltaPercent: number | null;
    yearlyDeltaPercent: number | null;
    dailyDeltaPercent: number | null;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfPrevYear = new Date(now.getFullYear() - 1, 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfPrevDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    const matchBase = { status: { $in: ["accepted", "completed"] }, adminRevenue: { $exists: true, $ne: null } };

    const [
      totalAgg,
      monthAgg,
      prevMonthAgg,
      yearAgg,
      prevYearAgg,
      dayAgg,
      prevDayAgg,
    ] = await Promise.all([
      this._model.aggregate([
        { $match: matchBase },
        { $group: { _id: null, value: { $sum: "$adminRevenue" } } },
      ]),
      this._model.aggregate([
        { $match: { ...matchBase, createdAt: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: null, value: { $sum: "$adminRevenue" } } },
      ]),
      this._model.aggregate([
        { $match: { ...matchBase, createdAt: { $gte: startOfPrevMonth, $lt: startOfMonth } } },
        { $group: { _id: null, value: { $sum: "$adminRevenue" } } },
      ]),
      this._model.aggregate([
        { $match: { ...matchBase, createdAt: { $gte: startOfYear, $lt: startOfNextYear } } },
        { $group: { _id: null, value: { $sum: "$adminRevenue" } } },
      ]),
      this._model.aggregate([
        { $match: { ...matchBase, createdAt: { $gte: startOfPrevYear, $lt: startOfYear } } },
        { $group: { _id: null, value: { $sum: "$adminRevenue" } } },
      ]),
      this._model.aggregate([
        { $match: { ...matchBase, createdAt: { $gte: startOfDay, $lt: startOfNextDay } } },
        { $group: { _id: null, value: { $sum: "$adminRevenue" } } },
      ]),
      this._model.aggregate([
        { $match: { ...matchBase, createdAt: { $gte: startOfPrevDay, $lt: startOfDay } } },
        { $group: { _id: null, value: { $sum: "$adminRevenue" } } },
      ]),
    ]);

    const totalRevenue = totalAgg[0]?.value || 0;
    const monthlyRevenue = monthAgg[0]?.value || 0;
    const prevMonthRevenue = prevMonthAgg[0]?.value || 0;
    const yearlyRevenue = yearAgg[0]?.value || 0;
    const prevYearRevenue = prevYearAgg[0]?.value || 0;
    const dailyRevenue = dayAgg[0]?.value || 0;
    const prevDailyRevenue = prevDayAgg[0]?.value || 0;

    const pct = (curr: number, prev: number): number | null => {
      if (!prev || prev === 0) return null;
      return ((curr - prev) / prev) * 100;
    };

    return {
      totalRevenue,
      monthlyRevenue,
      yearlyRevenue,
      dailyRevenue,
      monthlyDeltaPercent: pct(monthlyRevenue, prevMonthRevenue),
      yearlyDeltaPercent: pct(yearlyRevenue, prevYearRevenue),
      dailyDeltaPercent: pct(dailyRevenue, prevDailyRevenue),
    };
  }

  async getProDashboardMetrics(proId: string): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    dailyRevenue: number;
    completedJobs: number;
    pendingJobs: number;
    averageRating: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const proObjectId = new mongoose.Types.ObjectId(proId);

    const [
      totalAgg,
      monthAgg,
      yearAgg,
      dayAgg,
      completedJobs,
      pendingJobs,
      ratingResult,
    ] = await Promise.all([
      this._model.aggregate([
        { $match: { proId: proObjectId, status: { $in: ["accepted", "completed"] }, proRevenue: { $exists: true, $ne: null } } },
        { $group: { _id: null, value: { $sum: "$proRevenue" } } },
      ]),
      this._model.aggregate([
        { $match: { proId: proObjectId, status: { $in: ["accepted", "completed"] }, proRevenue: { $exists: true, $ne: null }, createdAt: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: null, value: { $sum: "$proRevenue" } } },
      ]),
      this._model.aggregate([
        { $match: { proId: proObjectId, status: { $in: ["accepted", "completed"] }, proRevenue: { $exists: true, $ne: null }, createdAt: { $gte: startOfYear, $lt: startOfNextYear } } },
        { $group: { _id: null, value: { $sum: "$proRevenue" } } },
      ]),
      this._model.aggregate([
        { $match: { proId: proObjectId, status: { $in: ["accepted", "completed"] }, proRevenue: { $exists: true, $ne: null }, createdAt: { $gte: startOfDay, $lt: startOfNextDay } } },
        { $group: { _id: null, value: { $sum: "$proRevenue" } } },
      ]),
      this._model.countDocuments({ proId: proObjectId, status: "completed" }),
      this._model.countDocuments({ proId: proObjectId, status: { $in: ["pending", "accepted"] } }),
      mongoose.model("RatingReview").aggregate([
        { $match: { proId: proObjectId } },
        { $group: { _id: null, averageRating: { $avg: "$rating" } } },
      ]),
    ]);

    const totalRevenue = totalAgg[0]?.value || 0;
    const monthlyRevenue = monthAgg[0]?.value || 0;
    const yearlyRevenue = yearAgg[0]?.value || 0;
    const dailyRevenue = dayAgg[0]?.value || 0;

    return {
      totalRevenue,
      monthlyRevenue,
      yearlyRevenue,
      dailyRevenue,
      completedJobs,
      pendingJobs,
      averageRating: ratingResult[0]?.averageRating || 0,
    };
  }

  async getTopPerformingPros(): Promise<{
    mostRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
    highestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
    leastRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
    lowestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
  }> {
    const [mostRated, leastRated, highestEarning, lowestEarning] = await Promise.all([

      mongoose.model("RatingReview").aggregate([
        { $group: { _id: "$proId", averageRating: { $avg: "$rating" }, count: { $sum: 1 } } },
        { $match: { count: { $gte: 1 } } },
        { $sort: { averageRating: -1 } },
        { $limit: 1 },
        { $lookup: { from: "approvedpros", localField: "_id", foreignField: "_id", as: "pro" } },
        { $unwind: "$pro" },
        { $project: { proId: "$_id", firstName: "$pro.firstName", lastName: "$pro.lastName", rating: "$averageRating" } }
      ]),

      mongoose.model("RatingReview").aggregate([
        { $group: { _id: "$proId", averageRating: { $avg: "$rating" }, count: { $sum: 1 } } },
        { $match: { count: { $gte: 2 } } },
        { $sort: { averageRating: 1 } },
        { $limit: 1 },
        { $lookup: { from: "approvedpros", localField: "_id", foreignField: "_id", as: "pro" } },
        { $unwind: "$pro" },
        { $project: { proId: "$_id", firstName: "$pro.firstName", lastName: "$pro.lastName", rating: "$averageRating" } }
      ]),

      this._model.aggregate([
        { $match: { status: { $in: ["accepted", "completed"] }, proRevenue: { $exists: true, $ne: null } } },
        { $group: { _id: "$proId", totalRevenue: { $sum: "$proRevenue" } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 1 },
        { $lookup: { from: "approvedpros", localField: "_id", foreignField: "_id", as: "pro" } },
        { $unwind: "$pro" },
        { $project: { proId: "$_id", firstName: "$pro.firstName", lastName: "$pro.lastName", revenue: "$totalRevenue" } }
      ]),

      this._model.aggregate([
        { $match: { status: { $in: ["accepted", "completed"] }, proRevenue: { $exists: true, $ne: null } } },
        { $group: { _id: "$proId", totalRevenue: { $sum: "$proRevenue" } } },
        { $sort: { totalRevenue: 1 } },
        { $limit: 1 },
        { $lookup: { from: "approvedpros", localField: "_id", foreignField: "_id", as: "pro" } },
        { $unwind: "$pro" },
        { $project: { proId: "$_id", firstName: "$pro.firstName", lastName: "$pro.lastName", revenue: "$totalRevenue" } }
      ])
    ]);

    const most = mostRated[0] || null;
    let least = leastRated[0] || null;
    if (most && least && String(most.proId) === String(least.proId)) {
      least = null;
    }

    return {
      mostRated: most,
      highestEarning: highestEarning[0] || null,
      leastRated: least,
      lowestEarning: lowestEarning[0] || null
    };
  }

  async getAdminMonthlyRevenueSeries(lastNMonths: number = 12): Promise<Array<{ year: number; month: number; revenue: number }>> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (lastNMonths - 1), 1);
    const pipeline = [
      { $match: { status: { $in: ["accepted", "completed"] }, adminRevenue: { $exists: true, $ne: null }, createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$adminRevenue" },
        },
      },
      { $sort: { "_id.year": 1 as const, "_id.month": 1 as const } },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          revenue: 1,
        },
      },
    ];
    const result = await this._model.aggregate(pipeline).exec();
    return result as Array<{ year: number; month: number; revenue: number }>;
  }

  async getPlatformProMonthlyRevenueSeries(lastNMonths: number = 12): Promise<Array<{ year: number; month: number; revenue: number }>> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (lastNMonths - 1), 1);
    const pipeline = [
      { $match: { status: { $in: ["accepted", "completed"] }, proRevenue: { $exists: true, $ne: null }, createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$proRevenue" },
        },
      },
      { $sort: { "_id.year": 1 as const, "_id.month": 1 as const } },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          revenue: 1,
        },
      },
    ];
    const result = await this._model.aggregate(pipeline).exec();
    return result as Array<{ year: number; month: number; revenue: number }>;
  }

  async getProMonthlyRevenueSeries(proId: string, lastNMonths: number = 12): Promise<Array<{ year: number; month: number; revenue: number }>> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (lastNMonths - 1), 1);
    const proObjectId = new mongoose.Types.ObjectId(proId);
    const pipeline = [
      { $match: { proId: proObjectId, status: { $in: ["accepted", "completed"] }, proRevenue: { $exists: true, $ne: null }, createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$proRevenue" },
        },
      },
      { $sort: { "_id.year": 1 as const, "_id.month": 1 as const } },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          revenue: 1,
        },
      },
    ];
    const result = await this._model.aggregate(pipeline).exec();
    return result as Array<{ year: number; month: number; revenue: number }>;
  }
}
