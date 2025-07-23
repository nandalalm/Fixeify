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
  fetchProBookings(proId: string, page?: number, limit?: number, status?: string): Promise<{ bookings: BookingResponse[]; total: number }>;
  acceptBooking(bookingId: string): Promise<{ message: string }>;
  rejectBooking(bookingId: string, rejectedReason: string): Promise<{ message: string }>;
  generateQuota(bookingId: string, data: QuotaRequest): Promise<QuotaResponse>;
  fetchQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null>;
  getWallet(proId: string): Promise<WalletResponseDTO | null>;
  getWalletWithPagination(proId: string, page: number, limit: number): Promise<{ wallet: WalletResponseDTO | null; total: number }>;
  requestWithdrawal(proId: string, data: { amount: number; paymentMode: "bank" | "upi"; bankName?: string; accountNumber?: string; ifscCode?: string; branchName?: string; upiCode?: string }): Promise<WithdrawalRequestResponse>;
  getWithdrawalRequestsByProId(proId: string): Promise<WithdrawalRequestResponse[]>;
  getPendingProById(pendingProId: string): Promise<PendingProResponse>;
}