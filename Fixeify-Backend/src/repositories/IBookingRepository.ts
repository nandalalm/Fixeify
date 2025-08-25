import { BookingResponse, BookingCompleteResponse } from "../dtos/response/bookingDtos";
import { BookingDocument,ILocation } from "../models/bookingModel";
import { ITimeSlot } from "../models/bookingModel";
import { Types } from "mongoose";

export interface PopulatedUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  photo?: string;
}

export interface PopulatedPro {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
}

export interface PopulatedCategory {
  _id: Types.ObjectId;
  name: string;
  image?: string;
}

export interface PopulatedBookingDocument {
  _id: Types.ObjectId;
  bookingId: string;
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
  hasComplaintRaisedByPro?: boolean;
  hasComplaintRaisedByUser?: boolean;
  adminRevenue?: number;
  proRevenue?: number;
}

export interface PopulatedLeanBooking {
  _id: Types.ObjectId;
  bookingId: string;
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
  hasComplaintRaisedByPro?: boolean;
  hasComplaintRaisedByUser?: boolean;
}

export interface IBookingRepository {
  createBooking(bookingData: Partial<BookingDocument>): Promise<BookingResponse>;
  fetchBookingDetails(
    userId: string,
    page?: number,
    limit?: number,
    search?: string,
    status?: string,
    sortBy?: "latest" | "oldest",
    bookingId?: string
  ): Promise<{ bookings: BookingResponse[]; total: number }>;
  fetchBookingHistoryDetails(
    userId: string,
    page?: number,
    limit?: number,
    search?: string,
    status?: string,
    sortBy?: "latest" | "oldest",
    bookingId?: string
  ): Promise<{ bookings: BookingResponse[]; total: number }>;
  fetchProBookings(
    proId: string,
    page?: number,
    limit?: number,
    status?: string,
    sortBy?: "latest" | "oldest",
    search?: string,
    bookingId?: string
  ): Promise<{ bookings: BookingResponse[]; total: number }>;
  fetchAllBookings(page?: number, limit?: number, search?: string, status?: string, sortBy?: "latest" | "oldest", bookingId?: string): Promise<{ bookings: BookingResponse[]; total: number }>; // supports filters and sorting, includes bookingId filter
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