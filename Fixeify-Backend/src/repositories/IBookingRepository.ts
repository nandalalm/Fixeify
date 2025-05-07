import { BookingResponse } from "../dtos/response/bookingDtos";
import { IBooking } from "../models/bookingModel";

export interface IBookingRepository {
  createBooking(bookingData: Partial<IBooking>): Promise<BookingResponse>;
  fetchBookingDetails(userId: string): Promise<BookingResponse[]>;
  fetchProBookings(proId: string): Promise<BookingResponse[]>;
}