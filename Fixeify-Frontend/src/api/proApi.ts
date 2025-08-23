import api from "./axios";
import { ProProfile, Availability } from "../interfaces/proInterface";
import { BookingResponse } from "../interfaces/bookingInterface";
import { QuotaRequest, QuotaResponse } from "../interfaces/quotaInterface";
import { WalletResponse } from "../interfaces/walletInterface";
import { WithdrawalFormData, IWithdrawalRequest } from "../interfaces/withdrawalRequestInterface";
import { PendingProResponse } from "../interfaces/fixeifyFormInterface";
import { ProBase } from "@/Constants/BaseRoutes";

export const getProProfile = async (userId: string): Promise<ProProfile> => {
  const response = await api.get(`${ProBase}/fetchProfile/${userId}`, { withCredentials: true });
  const proData = response.data;
  return {
    id: proData._id,
    firstName: proData.firstName,
    lastName: proData.lastName,
    email: proData.email,
    phoneNumber: proData.phoneNumber,
    location: proData.location,
    profilePhoto: proData.profilePhoto,
    about: proData.about,
    isBanned: proData.isBanned,
    categoryName: proData?.category?.name ?? proData?.categoryName ?? undefined,
  };
};

export const updateProProfile = async (userId: string, data: Partial<ProProfile>): Promise<ProProfile> => {
  const response = await api.put(`${ProBase}/updateProfile/${userId}`, data, { withCredentials: true });
  const proData = response.data;
  return {
    id: proData._id,
    firstName: proData.firstName,
    lastName: proData.lastName,
    email: proData.email,
    phoneNumber: proData.phoneNumber,
    location: proData.location,
    profilePhoto: proData.profilePhoto,
    about: proData.about,
    isBanned: proData.isBanned,
    categoryName: proData?.category?.name ?? proData?.categoryName ?? undefined,
  };
};

export const changeProPassword = async (
  userId: string,
  data: { currentPassword: string; newPassword: string }
): Promise<{ message: string }> => {
  const response = await api.put(`${ProBase}/changePassword/${userId}`, data, { withCredentials: true });
  return response.data;
};

export const getProAvailability = async (userId: string): Promise<{ availability: Availability; isUnavailable: boolean }> => {
  const response = await api.get(`${ProBase}/fetchAvailability/${userId}`, { withCredentials: true });
  return response.data;
};

export const updateProAvailability = async (userId: string, data: { availability: Availability; isUnavailable: boolean }): Promise<{ availability: Availability; isUnavailable: boolean }> => {
  const response = await api.put(`${ProBase}/updateAvailability/${userId}`, data, { withCredentials: true });
  return response.data;
};

export const fetchProBookings = async (
  proId: string,
  page: number = 1,
  limit: number = 5,
  status?: string,
  sortBy?: "latest" | "oldest"
): Promise<{ bookings: BookingResponse[]; total: number }> => {
  const response = await api.get(`${ProBase}/bookings/${proId}`, {
    params: { page, limit, status, sortBy },
    withCredentials: true,
  });
  return response.data;
};

export const acceptBooking = async (bookingId: string): Promise<{ message: string }> => {
  const response = await api.put(`${ProBase}/acceptBooking/${bookingId}`, {}, { withCredentials: true });
  return response.data;
};

export const rejectBooking = async (bookingId: string, reason: string): Promise<{ message: string }> => {
  const response = await api.put(`${ProBase}/rejectBooking/${bookingId}`, { rejectedReason: reason }, { withCredentials: true });
  return response.data;
};

export const generateQuota = async (bookingId: string, data: QuotaRequest): Promise<QuotaResponse> => {
  const response = await api.post(`${ProBase}/generateQuota/${bookingId}`, data, { withCredentials: true });
  return response.data;
};

export const fetchQuotaByBookingId = async (bookingId: string): Promise<QuotaResponse | null> => {
  const response = await api.get(`${ProBase}/fetchQuota/${bookingId}`, { withCredentials: true });
  return response.data;
};

export const findWalletByProId = async (proId: string): Promise<WalletResponse> => {
  const response = await api.get(`${ProBase}/wallet/${proId}`, { withCredentials: true });
  return response.data;
};

export const getWalletWithPagination = async (proId: string, page: number, limit: number): Promise<{ wallet: WalletResponse | null; total: number }> => {
  const response = await api.get(`${ProBase}/walletWithPagenation/${proId}`, {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const requestWithdrawal = async (
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
): Promise<WithdrawalFormData> => {
  const response = await api.post(`${ProBase}/requestWithdrawal/${proId}`, data, { withCredentials: true });
  return response.data;
};

export const fetchProWithdrawalRequests = async (
  proId: string,
  page: number,
  limit: number,
  sortBy?: "latest" | "oldest",
  status?: "pending" | "approved" | "rejected"
): Promise<{ withdrawals: IWithdrawalRequest[]; total: number }> => {
  const response = await api.get(`${ProBase}/withdrawalRequests/${proId}`, {
    params: { page, limit, sortBy, status },
    withCredentials: true,
  });
  return response.data;
};

export const fetchBookingById = async (bookingId: string): Promise<BookingResponse> => {
  const response = await api.get(`${ProBase}/booking/${bookingId}`, { withCredentials: true });
  return response.data;
};

export const getPendingProById = async (pendingProId: string): Promise<PendingProResponse> => {
  const response = await api.get(`${ProBase}/pending/${pendingProId}`);
  return response.data;
};

export const fetchProDashboardMetrics = async (proId: string): Promise<{
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  dailyRevenue: number;
  completedJobs: number;
  pendingJobs: number;
  averageRating: number;
  walletBalance: number;
  totalWithdrawn: number;
}> => {
  const response = await api.get(`${ProBase}/dashboard-metrics/${proId}`, {
    withCredentials: true,
  });
  return response.data;
};

export const fetchProMonthlyRevenueSeries = async (
  proId: string,
  lastNMonths?: number
): Promise<Array<{ year: number; month: number; revenue: number }>> => {
  const response = await api.get(`${ProBase}/monthly-revenue-series/${proId}`, {
    params: { lastNMonths },
    withCredentials: true,
  });
  return response.data;
};