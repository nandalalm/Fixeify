import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { IBookingRepository } from "./IBookingRepository";
import Booking, { BookingDocument, ITimeSlot, ILocation } from "../models/bookingModel";
import { BookingResponse } from "../dtos/response/bookingDtos";
import mongoose, { Document, Types } from "mongoose";

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

interface PopulatedBookingDocument extends Document {
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
  createdAt: Date;
  updatedAt: Date;
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
      ) as PopulatedBookingDocument;

    return this.mapToBookingResponse(booking);
  }

  async fetchBookingDetails(userId: string): Promise<BookingResponse[]> {
    const bookings = await this._model
      .find({ userId, status: { $in: ["pending", "accepted"] } })
      .populate<{ userId: PopulatedUser; proId: PopulatedPro; categoryId: PopulatedCategory }>([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .exec() as PopulatedBookingDocument[];

    return bookings.map((booking) => this.mapToBookingResponse(booking));
  }

  async fetchProBookings(proId: string): Promise<BookingResponse[]> {
    const bookings = await this._model
      .find({ proId })
      .populate<{ userId: PopulatedUser; proId: PopulatedPro; categoryId: PopulatedCategory }>([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .exec() as PopulatedBookingDocument[];

    return bookings.map((booking) => this.mapToBookingResponse(booking));
  }

  async updateBooking(bookingId: string, updateData: Partial<BookingDocument>): Promise<BookingDocument | null> {
    return this._model.findByIdAndUpdate(bookingId, updateData, { new: true }).exec();
  }

  async findBookingById(bookingId: string): Promise<BookingDocument | null> {
    return this._model.findById(bookingId).exec();
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
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    });
  }
}