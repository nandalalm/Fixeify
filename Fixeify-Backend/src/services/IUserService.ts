import type { UserResponse } from "../dtos/response/userDtos";
import type { ProResponse } from "../dtos/response/proDtos";
import type { BookingResponse, BookingCompleteResponse } from "../dtos/response/bookingDtos";
import type { QuotaResponse } from "../dtos/response/quotaDtos";
import type { ITimeSlot } from "../models/bookingModel";
import type { Stripe } from "stripe";

export interface IUserService {
  getUserProfile(userId: string): Promise<UserResponse | null>;
  updateUserProfile(
    userId: string,
    data: {
      name: string;
      email?: string;
      phoneNo: string | null;
      address?: {
        address: string;
        city: string;
        state: string;
        coordinates: { type: "Point"; coordinates: [number, number] };
      } | null;
      photo?: string | null;
    }
  ): Promise<UserResponse | null>;
  changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<UserResponse | null>;
  getNearbyPros(
    categoryId: string,
    longitude: number,
    latitude: number,
    skip?: number,
    limit?: number,
    sortBy?: string,
    availabilityFilter?: string
  ): Promise<{ pros: ProResponse[]; total: number; hasMore: boolean }>;
  createBooking(
    userId: string,
    proId: string,
    bookingData: {
      categoryId: string;
      issueDescription: string;
      location: {
        address: string;
        city: string;
        state: string;
        coordinates: { type: "Point"; coordinates: [number, number] };
      };
      phoneNumber: string;
      preferredDate: Date;
      preferredTime: ITimeSlot[];
    }
  ): Promise<BookingResponse>;
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
  cancelBooking(userId: string, bookingId: string, cancelReason: string): Promise<{ message: string }>;
  createPaymentIntent(bookingId: string, amount: number): Promise<{ clientSecret: string }>;
  recordPaymentEvent(paymentIntentId: string): Promise<boolean>;
  handlePaymentFailure(bookingId: string): Promise<void>;
  handleWebhookEvent(event: Stripe.Event): Promise<void>;
  getBookingById(bookingId: string): Promise<BookingCompleteResponse | null>;
  getQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null>;
}
