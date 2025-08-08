import { BookingResponse, BookingCompleteResponse } from "../dtos/response/bookingDtos";
import { BookingDocument } from "../models/bookingModel";
import { ITimeSlot } from "../models/bookingModel";

export interface IBookingRepository {
  createBooking(bookingData: Partial<BookingDocument>): Promise<BookingResponse>;
  fetchBookingDetails(userId: string, page?: number, limit?: number): Promise<{ bookings: BookingResponse[]; total: number }>;
  fetchBookingHistoryDetails(userId: string, page?: number, limit?: number): Promise<{ bookings: BookingResponse[]; total: number }>;
  fetchProBookings(proId: string, page?: number, limit?: number, status?: string): Promise<{ bookings: BookingResponse[]; total: number }>;
  fetchAllBookings(page?: number, limit?: number): Promise<{ bookings: BookingResponse[]; total: number }>; // New method
  updateBooking(bookingId: string, updateData: Partial<BookingDocument>): Promise<BookingDocument | null>;
  findBookingById(bookingId: string): Promise<BookingDocument | null>;
  findBookingByIdPopulated(bookingId: string): Promise<BookingResponse | null>;
  findBookingByIdComplete(bookingId: string): Promise<BookingCompleteResponse | null>;
  cancelBooking(bookingId: string, updateData: { status: string; cancelReason: string }): Promise<void>;
  findBookingsByProAndDate(
    proId: string,
    preferredDate: Date,
    timeSlots: ITimeSlot[],
    status: string,
    excludeBookingId?: string
  ): Promise<BookingResponse[]>;
  findBookingsByUserProDateTime(
    userId: string,
    proId: string,
    preferredDate: Date,
    timeSlots: ITimeSlot[],
    status: string
  ): Promise<BookingDocument[]>;
  getTrendingService(): Promise<{ categoryId: string; name: string; bookingCount: number } | null>;
  getAdminRevenueMetrics(): Promise<{ totalRevenue: number; monthlyRevenue: number }>;
  getProDashboardMetrics(proId: string): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    completedJobs: number;
    pendingJobs: number;
    averageRating: number;
  }>;
  getTopPerformingPros(): Promise<{
    mostRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
    highestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
    leastRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
    lowestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
  }>;
}