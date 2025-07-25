import { UserResponse } from "../dtos/response/userDtos";
import { ProResponse, PendingProResponse } from "../dtos/response/proDtos";
import { CategoryResponse } from "../dtos/response/categoryDtos";
import { BookingResponse } from "../dtos/response/bookingDtos";
import { QuotaResponse } from "../dtos/response/quotaDtos";
import { WithdrawalRequestResponse } from "../dtos/response/withdrawalDtos";

export interface IAdminService {
  getUsers(page: number, limit: number): Promise<{ users: UserResponse[]; total: number }>;
  banUser(userId: string, isBanned: boolean): Promise<UserResponse | null>;
  banPro(proId: string, isBanned: boolean): Promise<ProResponse | null>;
  getPendingPros(page: number, limit: number): Promise<{ pros: PendingProResponse[]; total: number }>;
  getPendingProById(id: string): Promise<PendingProResponse>;
  approvePro(id: string, about: string | null): Promise<void>;
  rejectPro(id: string, reason: string): Promise<void>;
  getApprovedPros(page: number, limit: number): Promise<{ pros: ProResponse[]; total: number }>;
  getApprovedProById(id: string): Promise<ProResponse>;
  createCategory(name: string, image: string): Promise<CategoryResponse>;
  getCategories(page: number, limit: number): Promise<{ categories: CategoryResponse[]; total: number }>;
  updateCategory(categoryId: string, data: { name?: string; image?: string }): Promise<CategoryResponse | null>;
  getBookings(page: number, limit: number, search?: string, status?: string): Promise<{ bookings: BookingResponse[]; total: number }>;
  getQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null>;
  getWithdrawalRequests(page: number, limit: number): Promise<{ withdrawals: WithdrawalRequestResponse[]; total: number; pros: ProResponse[] }>;
  acceptWithdrawalRequest(withdrawalId: string): Promise<void>;
  rejectWithdrawalRequest(withdrawalId: string, reason: string): Promise<void>;
  getTrendingService(): Promise<{ categoryId: string; name: string; bookingCount: number } | null>;
  getDashboardMetrics(adminId: string): Promise<{
    userCount: number;
    proCount: number;
    revenue: number;
    categoryCount: number;
    trendingService: { categoryId: string; name: string; bookingCount: number } | null;
  }>;
}