import { BookingResponse } from "../dtos/response/bookingDtos";
import { BookingDocument } from "../models/bookingModel";

export interface IBookingRepository {
  createBooking(bookingData: Partial<BookingDocument>): Promise<BookingResponse>;
  fetchBookingDetails(userId: string): Promise<BookingResponse[]>;
  fetchProBookings(proId: string): Promise<BookingResponse[]>;
  updateBooking(bookingId: string, updateData: Partial<BookingDocument>): Promise<BookingDocument | null>;
  findBookingById(bookingId: string): Promise<BookingDocument | null>;
}