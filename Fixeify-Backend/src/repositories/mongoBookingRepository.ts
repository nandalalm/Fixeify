import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { IBookingRepository } from "./IBookingRepository";
import Booking, { IBooking } from "../models/bookingModel";
import { BookingResponse } from "../dtos/response/bookingDtos";
import mongoose, { Document, Types } from "mongoose";

// Define the shape of the populated booking document
interface PopulatedBookingDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: { _id: mongoose.Types.ObjectId; name: string; email: string };
  proId: { _id: mongoose.Types.ObjectId; firstName: string; lastName: string };
  categoryId: { _id: mongoose.Types.ObjectId; name: string; image?: string };
  issueDescription: string;
  location: {
    address: string;
    city: string;
    state: string;
    coordinates: { type: "Point"; coordinates: [number, number] };
  };
  phoneNumber: string;
  preferredDate: Date;
  preferredTime: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class MongoBookingRepository extends BaseRepository<IBooking> implements IBookingRepository {
  constructor() {
    super(Booking);
  }

  async createBooking(bookingData: Partial<IBooking>): Promise<BookingResponse> {
    const booking = (await this._model
      .create(bookingData)
      .then((doc) =>
        doc.populate([
          { path: "userId", select: "name email" },
          { path: "proId", select: "firstName lastName" },
          { path: "categoryId", select: "name image" },
        ])
      )) as unknown as PopulatedBookingDocument;

    return this.mapToBookingResponse(booking);
  }

  async fetchBookingDetails(userId: string): Promise<BookingResponse[]> {
    const bookings = (await this._model
      .find({ userId, status: { $in: ["pending", "accepted"] } })
      .populate([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .exec()) as unknown as PopulatedBookingDocument[];

    return bookings.map((booking) => this.mapToBookingResponse(booking));
  }

  async fetchProBookings(proId: string): Promise<BookingResponse[]> {
    const bookings = (await this._model
      .find({ proId })
      .populate([
        { path: "userId", select: "name email" },
        { path: "proId", select: "firstName lastName" },
        { path: "categoryId", select: "name image" },
      ])
      .exec()) as unknown as PopulatedBookingDocument[];

    return bookings.map((booking) => this.mapToBookingResponse(booking));
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