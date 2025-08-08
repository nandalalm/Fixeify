import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { IBookingRepository } from "./IBookingRepository";
import Booking, { BookingDocument, ITimeSlot, ILocation } from "../models/bookingModel";
import { BookingResponse, BookingCompleteResponse } from "../dtos/response/bookingDtos";
import mongoose, { Types } from "mongoose";

interface PopulatedUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

interface PopulatedPro {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
}

interface PopulatedCategory {
  _id: Types.ObjectId;
  name: string;
  image?: string;
}

interface PopulatedBookingDocument {
  _id: Types.ObjectId;
  userId: PopulatedUser;
  proId: PopulatedPro;
  categoryId: PopulatedCategory;
  issueDescription: string;
  location: ILocation;
  phoneNumber: string;
  preferredDate: Date;
  preferredTime: ITimeSlot[];
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  rejectedReason?: string;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
  isRated?: boolean;
  adminRevenue?: number;
  proRevenue?: number;
}

interface PopulatedLeanBooking {
  _id: Types.ObjectId;
  userId: PopulatedUser;
  proId: PopulatedPro;
  categoryId: PopulatedCategory;
  issueDescription: string;
  location: ILocation;
  phoneNumber: string;
  preferredDate: Date;
  preferredTime: ITimeSlot[];
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  rejectedReason?: string;
  cancelReason?:string;
  createdAt: Date;
  updatedAt: Date;
  isRated?:boolean;
}

@injectable()
export class MongoBookingRepository extends BaseRepository<BookingDocument> implements IBookingRepository {
  constructor() {
    super(Booking);
  }

  async createBooking(bookingData: Partial<BookingDocument>): Promise<BookingResponse> {
    const booking = await this._model
      .create(bookingData)
      .then((doc) =>
        doc.populate([
          { path: "userId", select: "name email" },
          { path: "proId", select: "firstName lastName" },
          { path: "categoryId", select: "name image" },
        ])
      ) as any; 

    return this.mapToBookingResponse(booking.toObject() as PopulatedBookingDocument);
  }

  async fetchBookingDetails(userId: string, page: number = 1, limit: number = 5): Promise<{ bookings: BookingResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const bookings = await this._model
      .find({ userId, status: { $in: ["pending", "accepted"] } })
      .populate<{ userId: PopulatedUser; proId: PopulatedPro; categoryId: PopulatedCategory }>([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as PopulatedLeanBooking[];

    const total = await this._model.countDocuments({ userId, status: { $in: ["pending", "accepted"] } }).exec();
    return { 
      bookings: bookings.map((booking) => this.mapToBookingResponse(booking as PopulatedBookingDocument)), 
      total 
    };
  }

  async fetchBookingHistoryDetails(userId: string, page: number, limit: number): Promise<{ bookings: BookingResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const bookings = await this._model
      .find({ userId, status: { $in: ["completed", "rejected", "cancelled"] } })
      .populate<{ userId: PopulatedUser; proId: PopulatedPro; categoryId: PopulatedCategory }>([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as PopulatedLeanBooking[];

    const total = await this._model.countDocuments({ userId, status: { $in: ["completed", "rejected", "cancelled"] } }).exec();
    return { 
      bookings: bookings.map((booking) => this.mapToBookingResponse(booking as PopulatedBookingDocument)), 
      total 
    };
  }

  async fetchProBookings(proId: string, page: number = 1, limit: number = 5, status?: string): Promise<{ bookings: BookingResponse[]; total: number }> {
  const skip = (page - 1) * limit;
  const query: any = { proId: new mongoose.Types.ObjectId(proId) };
  if (status) {
    const statusArray = status.split(",").map(s => s.trim());
    if (statusArray.length > 1) {
      query.status = { $in: statusArray };
    } else {
      query.status = statusArray[0]; 
    }
  }
  const bookings = await this._model
    .find(query)
    .populate<{ userId: PopulatedUser; proId: PopulatedPro; categoryId: PopulatedCategory }>([
      { path: "userId", select: "name email" },
      { path: "proId", select: "firstName lastName" },
      { path: "categoryId", select: "name image" },
    ])
    .skip(skip)
    .limit(limit)
    .lean()
    .exec() as PopulatedLeanBooking[];

  const total = await this._model.countDocuments(query).exec();
  return { 
    bookings: bookings.map((booking) => this.mapToBookingResponse(booking as PopulatedBookingDocument)), 
    total 
  };
}

async fetchAllBookings(page: number = 1, limit: number = 5): Promise<{ bookings: BookingResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const bookings = await this._model
      .find()
      .populate<{ userId: PopulatedUser; proId: PopulatedPro; categoryId: PopulatedCategory }>([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as PopulatedLeanBooking[];

    const total = await this._model.countDocuments().exec();
    return { 
      bookings: bookings.map((booking) => this.mapToBookingResponse(booking as PopulatedBookingDocument)), 
      total 
    };
  }

  async updateBooking(bookingId: string, updateData: Partial<BookingDocument>): Promise<BookingDocument | null> {
    return this._model.findByIdAndUpdate(bookingId, updateData, { new: true }).exec();
  }

  async findBookingById(bookingId: string): Promise<BookingDocument | null> {
    return this._model.findById(bookingId).exec();
  }

  async findBookingByIdPopulated(bookingId: string): Promise<BookingResponse | null> {
    const booking = await this._model
      .findById(bookingId)
      .populate<{ userId: PopulatedUser; proId: PopulatedPro; categoryId: PopulatedCategory }>([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .lean()
      .exec() as PopulatedLeanBooking | null;

    return booking ? this.mapToBookingResponse(booking as PopulatedBookingDocument) : null;
  }

  async findBookingByIdComplete(bookingId: string): Promise<BookingCompleteResponse | null> {
    const booking = await this._model
      .findById(bookingId)
      .populate<{ userId: PopulatedUser; proId: PopulatedPro; categoryId: PopulatedCategory }>([
        { path: "userId", select: "name email photo" },
        { path: "proId", select: "firstName lastName profilePhoto email phoneNumber" },
        { path: "categoryId", select: "name image" },
      ])
      .lean()
      .exec() as PopulatedLeanBooking | null;

    return booking ? this.mapToBookingCompleteResponse(booking as PopulatedBookingDocument) : null;
  }

  private mapToBookingCompleteResponse(booking: PopulatedBookingDocument): BookingCompleteResponse {
    return new BookingCompleteResponse({
      id: booking._id.toString(),
      user: {
        id: booking.userId._id.toString(),
        name: booking.userId.name,
        email: booking.userId.email,
        photo: (booking.userId as any).photo,
      },
      pro: {
        id: booking.proId._id.toString(),
        firstName: booking.proId.firstName,
        lastName: booking.proId.lastName,
        profilePhoto: (booking.proId as any).profilePhoto,
        email: (booking.proId as any).email,
        phoneNumber: (booking.proId as any).phoneNumber,
      },
      category: {
        id: booking.categoryId._id.toString(),
        name: booking.categoryId.name,
        image: booking.categoryId.image,
      },
      issueDescription: booking.issueDescription,
      location: booking.location,
      phoneNumber: booking.phoneNumber,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      status: booking.status,
      rejectedReason: booking.rejectedReason,
      cancelReason: booking.cancelReason,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      isRated: booking.isRated,
      adminRevenue: booking.adminRevenue,
      proRevenue: booking.proRevenue,
    });
  }

  async cancelBooking(bookingId: string, updateData: { status: string; cancelReason: string }): Promise<void> {
    await this._model.findByIdAndUpdate(bookingId, updateData, { new: true }).exec();
  }

  async findBookingsByProAndDate(
    proId: string,
    preferredDate: Date,
    timeSlots: ITimeSlot[],
    status: string,
    excludeBookingId?: string
  ): Promise<BookingResponse[]> {
    const startOfDay = new Date(preferredDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(preferredDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query: any = {
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
      .populate<{ userId: PopulatedUser; proId: PopulatedPro; categoryId: PopulatedCategory }>([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .lean()
      .exec() as PopulatedLeanBooking[];

    return bookings.map((booking) => this.mapToBookingResponse(booking as PopulatedBookingDocument));
  }

  async findBookingsByUserProDateTime(
    userId: string,
    proId: string,
    preferredDate: Date,
    timeSlots: ITimeSlot[],
    status: string
  ): Promise<BookingDocument[]> {
    const startOfDay = new Date(preferredDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(preferredDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query: any = {
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

    return await this._model.find(query).lean().exec();
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

  private mapToBookingResponse(booking: PopulatedBookingDocument): BookingResponse {
    return new BookingResponse({
      id: booking._id.toString(),
      user: {
        id: booking.userId._id.toString(),
        name: booking.userId.name,
        email: booking.userId.email,
      },
      pro: {
        id: booking.proId._id.toString(),
        firstName: booking.proId.firstName,
        lastName: booking.proId.lastName,
      },
      category: {
        id: booking.categoryId._id.toString(),
        name: booking.categoryId.name,
        image: booking.categoryId.image,
      },
      issueDescription: booking.issueDescription,
      location: booking.location,
      phoneNumber: booking.phoneNumber,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      status: booking.status,
      rejectedReason: booking.rejectedReason,
      cancelReason: booking.cancelReason,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      isRated: booking.isRated,
      adminRevenue: booking.adminRevenue,
      proRevenue: booking.proRevenue,
    });
  }

  async getAdminRevenueMetrics(): Promise<{ totalRevenue: number; monthlyRevenue: number }> {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const [totalResult, monthlyResult] = await Promise.all([
      this._model.aggregate([
        { $match: { status: "completed", adminRevenue: { $exists: true, $ne: null } } },
        { $group: { _id: null, totalRevenue: { $sum: "$adminRevenue" } } }
      ]),
      this._model.aggregate([
        { 
          $match: { 
            status: "completed", 
            adminRevenue: { $exists: true, $ne: null },
            createdAt: { $gte: startOfMonth }
          } 
        },
        { $group: { _id: null, monthlyRevenue: { $sum: "$adminRevenue" } } }
      ])
    ]);

    return {
      totalRevenue: totalResult[0]?.totalRevenue || 0,
      monthlyRevenue: monthlyResult[0]?.monthlyRevenue || 0
    };
  }

  async getProDashboardMetrics(proId: string): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    completedJobs: number;
    pendingJobs: number;
    averageRating: number;
  }> {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const proObjectId = new mongoose.Types.ObjectId(proId);

    const [revenueResult, monthlyRevenueResult, completedJobs, pendingJobs, ratingResult] = await Promise.all([
      this._model.aggregate([
        { $match: { proId: proObjectId, status: "completed", proRevenue: { $exists: true, $ne: null } } },
        { $group: { _id: null, totalRevenue: { $sum: "$proRevenue" } } }
      ]),
      this._model.aggregate([
        { 
          $match: { 
            proId: proObjectId, 
            status: "completed", 
            proRevenue: { $exists: true, $ne: null },
            createdAt: { $gte: startOfMonth }
          } 
        },
        { $group: { _id: null, monthlyRevenue: { $sum: "$proRevenue" } } }
      ]),
      this._model.countDocuments({ proId: proObjectId, status: "completed" }),
      this._model.countDocuments({ proId: proObjectId, status: { $in: ["pending", "accepted"] } }),
      mongoose.model("RatingReview").aggregate([
        { $match: { proId: proObjectId } },
        { $group: { _id: null, averageRating: { $avg: "$rating" } } }
      ])
    ]);

    return {
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
      monthlyRevenue: monthlyRevenueResult[0]?.monthlyRevenue || 0,
      completedJobs,
      pendingJobs,
      averageRating: ratingResult[0]?.averageRating || 0
    };
  }

  async getTopPerformingPros(): Promise<{
    mostRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
    highestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
    leastRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
    lowestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
  }> {
    const [mostRated, leastRated, highestEarning, lowestEarning] = await Promise.all([
      // Most rated pro
      mongoose.model("RatingReview").aggregate([
        { $group: { _id: "$proId", averageRating: { $avg: "$rating" }, count: { $sum: 1 } } },
        { $match: { count: { $gte: 1 } } },
        { $sort: { averageRating: -1 } },
        { $limit: 1 },
        { $lookup: { from: "approvedpros", localField: "_id", foreignField: "_id", as: "pro" } },
        { $unwind: "$pro" },
        { $project: { proId: "$_id", firstName: "$pro.firstName", lastName: "$pro.lastName", rating: "$averageRating" } }
      ]),
      // Least rated pro
      mongoose.model("RatingReview").aggregate([
        { $group: { _id: "$proId", averageRating: { $avg: "$rating" }, count: { $sum: 1 } } },
        { $match: { count: { $gte: 1 } } },
        { $sort: { averageRating: 1 } },
        { $limit: 1 },
        { $lookup: { from: "approvedpros", localField: "_id", foreignField: "_id", as: "pro" } },
        { $unwind: "$pro" },
        { $project: { proId: "$_id", firstName: "$pro.firstName", lastName: "$pro.lastName", rating: "$averageRating" } }
      ]),
      // Highest earning pro
      this._model.aggregate([
        { $match: { status: "completed", proRevenue: { $exists: true, $ne: null } } },
        { $group: { _id: "$proId", totalRevenue: { $sum: "$proRevenue" } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 1 },
        { $lookup: { from: "approvedpros", localField: "_id", foreignField: "_id", as: "pro" } },
        { $unwind: "$pro" },
        { $project: { proId: "$_id", firstName: "$pro.firstName", lastName: "$pro.lastName", revenue: "$totalRevenue" } }
      ]),
      // Lowest earning pro
      this._model.aggregate([
        { $match: { status: "completed", proRevenue: { $exists: true, $ne: null } } },
        { $group: { _id: "$proId", totalRevenue: { $sum: "$proRevenue" } } },
        { $sort: { totalRevenue: 1 } },
        { $limit: 1 },
        { $lookup: { from: "approvedpros", localField: "_id", foreignField: "_id", as: "pro" } },
        { $unwind: "$pro" },
        { $project: { proId: "$_id", firstName: "$pro.firstName", lastName: "$pro.lastName", revenue: "$totalRevenue" } }
      ])
    ]);

    return {
      mostRated: mostRated[0] || null,
      highestEarning: highestEarning[0] || null,
      leastRated: leastRated[0] || null,
      lowestEarning: lowestEarning[0] || null
    };
  }
}