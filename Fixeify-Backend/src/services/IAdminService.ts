import { UserResponse } from "../dtos/response/userDtos";
import { ProResponse, PendingProResponse } from "../dtos/response/proDtos";
import { CategoryResponse } from "../dtos/response/categoryDtos";
import { BookingResponse } from "../dtos/response/bookingDtos";
import { QuotaResponse } from "../dtos/response/quotaDtos";
import { WithdrawalRequestResponse } from "../dtos/response/withdrawalDtos";

export interface IAdminService {
  getUsers(page: number, limit: number, sortBy?: "latest" | "oldest"): Promise<{ users: UserResponse[]; total: number }>;
  banUser(userId: string, isBanned: boolean): Promise<UserResponse | null>;
  banPro(proId: string, isBanned: boolean): Promise<ProResponse | null>;
  getPendingPros(page: number, limit: number, sortBy?: "latest" | "oldest"): Promise<{ pros: PendingProResponse[]; total: number }>;
  getPendingProById(id: string): Promise<PendingProResponse>;
  approvePro(id: string, about: string | null): Promise<void>;
  rejectPro(id: string, reason: string): Promise<void>;
  getApprovedPros(page: number, limit: number, sortBy?: "latest" | "oldest"): Promise<{ pros: ProResponse[]; total: number }>;
  getApprovedProById(id: string): Promise<ProResponse>;
  createCategory(name: string, image: string): Promise<CategoryResponse>;
  getCategories(page: number, limit: number): Promise<{ categories: CategoryResponse[]; total: number }>;
  updateCategory(categoryId: string, data: { name?: string; image?: string }): Promise<CategoryResponse | null>;
  getBookings(page: number, limit: number, search?: string, status?: string, sortBy?: "latest" | "oldest"): Promise<{ bookings: BookingResponse[]; total: number }>;
  getQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null>;
  getWithdrawalRequests(
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest",
    status?: "pending" | "approved" | "rejected"
  ): Promise<{ withdrawals: WithdrawalRequestResponse[]; total: number; pros: ProResponse[] }>;
  acceptWithdrawalRequest(withdrawalId: string): Promise<void>;
  rejectWithdrawalRequest(withdrawalId: string, reason: string): Promise<void>;
  getTrendingService(): Promise<{ categoryId: string; name: string; bookingCount: number } | null>;
  getAdminTransactions(adminId: string, page: number, limit: number): Promise<{
    transactions: Array<{
      id: string;
      proId: string;
      walletId?: string;
      amount: number;
      type: "credit" | "debit";
      date: Date;
      description?: string;
      bookingId?: string;
      quotaId?: string;
      adminId?: string;
      createdAt: Date;
      updatedAt: Date;
    }>; total: number
  }>;
  getDashboardMetrics(adminId: string): Promise<{
    userCount: number;
    proCount: number;
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    dailyRevenue: number;
    monthlyDeltaPercent: number | null;
    yearlyDeltaPercent: number | null;
    dailyDeltaPercent: number | null;
    categoryCount: number;
    trendingService: { categoryId: string; name: string; bookingCount: number } | null;
    topPerformingPros: {
      mostRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
      highestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
      leastRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
      lowestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
    };
  }>;
  getMonthlyRevenueSeries(lastNMonths?: number): Promise<Array<{ year: number; month: number; revenue: number }>>;
  getPlatformProMonthlyRevenueSeries(lastNMonths?: number): Promise<Array<{ year: number; month: number; revenue: number }>>;
}