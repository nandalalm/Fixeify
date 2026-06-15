import type { ClientSession } from "mongoose";
import type { BookingDocument } from "../models/bookingModel";
import type { BookingTimeSlot } from "../contracts/api/bookingTypes";
import type { BookingCompleteRecord, BookingConflictQueryRecord, BookingListProjectionRecord, PopulatedBookingRecord } from "../contracts/repository/bookingRecords";

export interface IBookingRepository {
  createBooking(bookingData: Partial<BookingDocument>, session?: ClientSession): Promise<PopulatedBookingRecord>;
  fetchBookingDetails(
    userId: string,
    page?: number,
    limit?: number,
    search?: string,
    status?: string,
    sortBy?: "latest" | "oldest",
    bookingId?: string
  ): Promise<{ bookings: BookingListProjectionRecord[]; total: number }>;
  fetchBookingHistoryDetails(
    userId: string,
    page?: number,
    limit?: number,
    search?: string,
    status?: string,
    sortBy?: "latest" | "oldest",
    bookingId?: string
  ): Promise<{ bookings: BookingListProjectionRecord[]; total: number }>;
  fetchProBookings(
    proId: string,
    page?: number,
    limit?: number,
    status?: string,
    sortBy?: "latest" | "oldest",
    search?: string,
    bookingId?: string
  ): Promise<{ bookings: BookingListProjectionRecord[]; total: number }>;
  fetchAllBookings(page?: number, limit?: number, search?: string, status?: string, sortBy?: "latest" | "oldest", bookingId?: string): Promise<{ bookings: BookingListProjectionRecord[]; total: number }>;
  updateBooking(bookingId: string, updateData: Partial<BookingDocument>, session?: ClientSession): Promise<BookingDocument | null>;
  findBookingById(bookingId: string, session?: ClientSession): Promise<BookingDocument | null>;
  findBookingByIdPopulated(bookingId: string): Promise<PopulatedBookingRecord | null>;
  findBookingByIdComplete(bookingId: string): Promise<BookingCompleteRecord | null>;
  cancelBooking(bookingId: string, updateData: { status: string; cancelReason: string }): Promise<void>;
  findBookingsByProAndDate(
    proId: string,
    preferredDate: Date,
    timeSlots: BookingTimeSlot[],
    status: string,
    excludeBookingId?: string,
    session?: ClientSession
  ): Promise<BookingConflictQueryRecord[]>;
  findBookingsByUserProDateTime(
    userId: string,
    proId: string,
    preferredDate: Date,
    timeSlots: BookingTimeSlot[],
    status: string,
    session?: ClientSession
  ): Promise<BookingConflictQueryRecord[]>;
  getTrendingService(): Promise<{ categoryId: string; name: string; bookingCount: number } | null>;
  getTopCategoriesByCompleted(limit: number): Promise<Array<{ categoryId: string; name: string; image?: string; bookingCount: number }>>;
  getAdminRevenueMetrics(): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    dailyRevenue: number;
    monthlyDeltaPercent: number | null;
    yearlyDeltaPercent: number | null;
    dailyDeltaPercent: number | null;
  }>;
  getProDashboardMetrics(proId: string): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    dailyRevenue: number;
    completedJobs: number;
    pendingJobs: number;
    averageRating: number;
  }>;
  getAdminMonthlyRevenueSeries(lastNMonths?: number): Promise<Array<{ year: number; month: number; revenue: number }>>;
  getProMonthlyRevenueSeries(proId: string, lastNMonths?: number): Promise<Array<{ year: number; month: number; revenue: number }>>;
  getPlatformProMonthlyRevenueSeries(lastNMonths?: number): Promise<Array<{ year: number; month: number; revenue: number }>>;
  getTopPerformingPros(): Promise<{
    mostRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
    highestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
    leastRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
    lowestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
  }>;
}
