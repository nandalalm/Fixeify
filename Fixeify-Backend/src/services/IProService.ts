import { ProProfileResponse } from "../dtos/response/proDtos";
import { IPendingPro } from "../models/pendingProModel";
import { UserResponse } from "../dtos/response/userDtos";
import { CategoryResponse } from "../dtos/response/categoryDtos";
import { BookingResponse } from "../dtos/response/bookingDtos";
import { QuotaResponse, QuotaRequest } from "../dtos/response/quotaDtos";
import { WalletResponseDTO } from "../dtos/response/walletDtos";
import { WithdrawalRequestResponse } from "../dtos/response/withdrawalDtos";
import { PendingProResponse } from "../dtos/response/proDtos";

export interface IAvailability {
  monday?: ITimeSlot[];
  tuesday?: ITimeSlot[];
  wednesday?: ITimeSlot[];
  thursday?: ITimeSlot[];
  friday?: ITimeSlot[];
  saturday?: ITimeSlot[];
  sunday?: ITimeSlot[];
}

export interface ITimeSlot {
  startTime: string;
  endTime: string;
  booked: boolean;
}

export interface IProService {
  applyPro(proData: Partial<IPendingPro>): Promise<{ message: string; pendingPro: IPendingPro }>;
  getProfile(proId: string): Promise<ProProfileResponse>;
  updateProfile(proId: string, data: Partial<ProProfileResponse>): Promise<ProProfileResponse>;
  changePassword(
    proId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<UserResponse | null>;
  getAvailability(proId: string): Promise<{ availability: IAvailability; isUnavailable: boolean }>;
  updateAvailability(proId: string, data: { availability: IAvailability; isUnavailable: boolean }): Promise<{ availability: IAvailability; isUnavailable: boolean }>;
  getAllCategories(): Promise<CategoryResponse[]>;
  fetchProBookings(
    proId: string,
    page?: number,
    limit?: number,
    status?: string,
    sortBy?: "latest" | "oldest",
    search?: string,
    bookingId?: string
  ): Promise<{ bookings: BookingResponse[]; total: number }>;
  getBookingById(id: string): Promise<BookingResponse>;
  acceptBooking(bookingId: string): Promise<{ message: string }>;
  rejectBooking(bookingId: string, rejectedReason: string): Promise<{ message: string }>;
  generateQuota(bookingId: string, data: QuotaRequest): Promise<QuotaResponse>;
  fetchQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null>;
  getWallet(proId: string): Promise<WalletResponseDTO | null>;
  getWalletWithPagination(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "credit" | "debit",
    search?: string
  ): Promise<{ wallet: WalletResponseDTO | null; total: number }>;
  requestWithdrawal(
    proId: string,
    data: {
      amount: number;
      paymentMode: "bank" | "upi";
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      branchName?: string;
      upiCode?: string;
      bookingId?: string;
    }
  ): Promise<WithdrawalRequestResponse>;
  getWithdrawalRequestsByProId(proId: string): Promise<WithdrawalRequestResponse[]>;
  getWithdrawalRequestsByProIdPaginated(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest",
    status?: "pending" | "approved" | "rejected"
  ): Promise<{ withdrawals: WithdrawalRequestResponse[]; total: number }>;
  getPendingProById(pendingProId: string): Promise<PendingProResponse>;
  getDashboardMetrics(proId: string): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    dailyRevenue: number;
    completedJobs: number;
    pendingJobs: number;
    averageRating: number;
    walletBalance: number;
    totalWithdrawn: number;
  }>;
  getMonthlyRevenueSeries(proId: string, lastNMonths?: number): Promise<Array<{ year: number; month: number; revenue: number }>>;
  getPopularCategories(limit?: number): Promise<Array<{ id: string; name: string; image?: string; bookingCount: number }>>;
}