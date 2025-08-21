import api from "./axios";
import { BookingResponse } from "../interfaces/bookingInterface";
import { QuotaResponse } from "../interfaces/quotaInterface";
import { ICategory, User, PendingPro, IApprovedPro, BanStatusResponse } from "../interfaces/adminInterface";
import { IWithdrawalRequest } from "../interfaces/withdrawalRequestInterface";
import { AdminBase } from "@/Constants/BaseRoutes";

export const fetchCategories = async (
  page: number = 1,
  limit: number = 5
): Promise<{ categories: ICategory[]; total: number }> => {
  const response = await api.get(`${AdminBase}/fetchCategories`, {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const addCategory = async (data: { name: string; image: string }): Promise<ICategory> => {
  const response = await api.post(`${AdminBase}/addCategories`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const updateCategory = async (
  categoryId: string,
  data: { name?: string; image?: string }
): Promise<ICategory> => {
  const response = await api.put(`${AdminBase}/updateCategories/${categoryId}`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const fetchUsers = async (page: number = 1, limit: number = 5): Promise<{ users: User[]; total: number }> => {
  const response = await api.get(`${AdminBase}/fetchUsers`, {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const toggleBanUser = async (userId: string, isBanned: boolean): Promise<User> => {
  const response = await api.put(`${AdminBase}/banUsers/${userId}`, { isBanned }, { withCredentials: true });
  return response.data;
};

export const toggleBanPro = async (proId: string, isBanned: boolean): Promise<IApprovedPro> => {
  const response = await api.put(`${AdminBase}/banApproved-pros/${proId}`, { isBanned }, { withCredentials: true });
  return response.data;
};

export const fetchPendingPros = async (page: number = 1, limit: number = 5): Promise<{ pros: PendingPro[]; total: number }> => {
  const response = await api.get(`${AdminBase}/fetchPending-pros`, {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const fetchPendingProById = async (id: string): Promise<PendingPro> => {
  const response = await api.get(`${AdminBase}/fetchPending-pro/${id}`, {
    withCredentials: true,
  });
  return response.data;
};

export const approvePro = async (id: string, data: { about?: string | null }): Promise<void> => {
  const response = await api.post(`${AdminBase}/approvePending-pros/${id}`, data, { withCredentials: true });
  return response.data;
};

export const rejectPro = async (id: string, data: { reason: string }): Promise<void> => {
  const response = await api.post(`${AdminBase}/rejectPending-pros/${id}`, data, { withCredentials: true });
  return response.data;
};

export const fetchApprovedPros = async (page: number = 1, limit: number = 5): Promise<{ pros: IApprovedPro[]; total: number }> => {
  const response = await api.get(`${AdminBase}/fetchApproved-pros`, {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const fetchApprovedProById = async (id: string): Promise<IApprovedPro> => {
  const response = await api.get(`${AdminBase}/fetchApproved-pro/${id}`, {
    withCredentials: true,
  });
  return response.data;
};

export const checkBanStatus = async (userId: string): Promise<BanStatusResponse> => {
  const response = await api.get(`/auth/check-ban/${userId}`, {
    withCredentials: true,
  });
  return response.data;
};

export const fetchAdminBookings = async (
  page: number = 1,
  limit: number = 5,
  search?: string,
  status?: string,
  sortBy?: "latest" | "oldest"
): Promise<{ bookings: BookingResponse[]; total: number }> => {
  const response = await api.get(`${AdminBase}/fetchBookings`, {
    params: { page, limit, search, status, sortBy },
    withCredentials: true,
  });
  return response.data;
};

export const fetchQuotaByBookingId = async (bookingId: string): Promise<QuotaResponse> => {
  const response = await api.get(`${AdminBase}/fetchQuota/${bookingId}`, {
    withCredentials: true,
  });
  return response.data;
};

export const fetchWithdrawalRequests = async (
  page: number = 1,
  limit: number = 5
): Promise<{ withdrawals: IWithdrawalRequest[]; total: number; pros: IApprovedPro[] }> => {
  const response = await api.get(`${AdminBase}/fetchWithdrawalRequests`, {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const acceptWithdrawalRequest = async (withdrawalId: string): Promise<void> => {
  const response = await api.post(`${AdminBase}/acceptWithdrawalRequest/${withdrawalId}`, {}, {
    withCredentials: true,
  });
  return response.data;
};

export const rejectWithdrawalRequest = async (withdrawalId: string, data: { reason: string }): Promise<void> => {
  const response = await api.post(`${AdminBase}/rejectWithdrawalRequest/${withdrawalId}`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const fetchDashboardMetrics = async (adminId: string): Promise<{
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
}> => {
  const response = await api.get(`${AdminBase}/dashboard-metrics`, {
    params: { adminId },
    withCredentials: true,
  });
  return response.data;
};

export interface AdminTransactionDTO {
  id: string;
  proId: string;
  walletId?: string;
  amount: number;
  type: "credit" | "debit";
  date: string | Date;
  description?: string;
  bookingId?: string;
  quotaId?: string;
  adminId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export const fetchAdminTransactions = async (
  adminId: string,
  page: number,
  limit: number
): Promise<{ transactions: AdminTransactionDTO[]; total: number }> => {
  const response = await api.get(`${AdminBase}/admin-transactions`, { params: { adminId, page, limit } });
  return response.data;
};

export const fetchAdminMonthlyRevenueSeries = async (
  lastNMonths?: number
): Promise<Array<{ year: number; month: number; revenue: number }>> => {
  const response = await api.get(`${AdminBase}/monthly-revenue-series`, {
    params: { lastNMonths },
    withCredentials: true,
  });
  return response.data;
};

export const fetchPlatformProMonthlyRevenueSeries = async (
  lastNMonths?: number
): Promise<Array<{ year: number; month: number; revenue: number }>> => {
  const response = await api.get(`${AdminBase}/platform-pro-monthly-revenue-series`, {
    params: { lastNMonths },
    withCredentials: true,
  });
  return response.data;
};