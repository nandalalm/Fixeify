import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IProRepository } from "../repositories/IProRepository";
import { ICategoryRepository } from "../repositories/ICategoryRepository";
import { IBookingRepository } from "../repositories/IBookingRepository";
import { IWithdrawalRequestRepository } from "../repositories/IWithdrawalRequestRepository";
import { IPendingPro, PendingProDocument } from "../models/pendingProModel";
import { IProService, IAvailability } from "./IProService";
import { ProProfileResponse, ProResponse, PendingProResponse } from "../dtos/response/proDtos";
import { UserResponse } from "../dtos/response/userDtos";
import { CategoryResponse } from "../dtos/response/categoryDtos";
import { BookingResponse } from "../dtos/response/bookingDtos";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";
import { ApprovedProDocument } from "../models/approvedProModel";
import { UserRole } from "../enums/roleEnum";
import bcrypt from "bcryptjs";
import { IQuotaRepository } from "../repositories/IQuotaRepository";
import { QuotaRequest, QuotaResponse } from "../dtos/response/quotaDtos";
import mongoose from "mongoose";
import { IWalletRepository } from "../repositories/IWalletRepository";
import { IAdminRepository } from "../repositories/IAdminRepository";
import { WalletResponseDTO } from "../dtos/response/walletDtos";
import { WithdrawalRequestResponse } from "../dtos/response/withdrawalDtos";
import { INotificationService } from "./INotificationService";

@injectable()
export class ProService implements IProService {
  constructor(
    @inject(TYPES.IProRepository) private _proRepository: IProRepository,
    @inject(TYPES.ICategoryRepository) private _categoryRepository: ICategoryRepository,
    @inject(TYPES.IBookingRepository) private _bookingRepository: IBookingRepository,
    @inject(TYPES.IQuotaRepository) private _quotaRepository: IQuotaRepository,
    @inject(TYPES.IWalletRepository) private _walletRepository: IWalletRepository,
    @inject(TYPES.IWithdrawalRequestRepository) private _withdrawalRequestRepository: IWithdrawalRequestRepository,
    @inject(TYPES.INotificationService) private _notificationService: INotificationService,
    @inject(TYPES.IAdminRepository) private _adminRepository: IAdminRepository
  ) { }

  async applyPro(proData: Partial<IPendingPro>): Promise<{ message: string; pendingPro: IPendingPro }> {
    const existingPending = await this._proRepository.findPendingProByEmail(proData.email!);
    const existingApproved = await this._proRepository.findApprovedProByEmail(proData.email!);

    if (existingPending && !existingPending.isRejected) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.APPLICATION_ALREADY_PENDING);
    }

    if (existingApproved) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.APPLICATION_ALREADY_APPROVED);
    }

    let pendingPro: PendingProDocument;

    if (existingPending && existingPending.isRejected) {
      const updatedPro = await this._proRepository.updatePendingPro(existingPending._id.toString(), {
        ...proData,
        isRejected: false,
        createdAt: new Date(),
      });
      if (!updatedPro) {
        throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
      }
      pendingPro = updatedPro;
    } else {
      pendingPro = await this._proRepository.createPendingPro(proData);
    }

    // Notify admin about new/re-submitted pro application
    try {
      const admin = await this._adminRepository.find();
      if (admin) {
        await this._notificationService.createNotification({
          type: "general",
          title: "New Pro Application Received",
          description: `${proData.firstName ?? ""} ${proData.lastName ?? ""} (${proData.email ?? "unknown email"}) has applied to become a Fixeify Pro.`,
          adminId: admin.id,
        });
      }
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_NOTIFICATION + ":", error);
    }

    return { message: MESSAGES.APPLICATION_SUBMITTED_SUCCESSFULLY, pendingPro };
  }

  async getProfile(proId: string): Promise<ProProfileResponse> {
    const pro = await this._proRepository.findApprovedProByIdAsProfile(proId);
    if (!pro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
    return pro;
  }

  async updateProfile(proId: string, data: Partial<ProProfileResponse>): Promise<ProProfileResponse> {
    const existingPro = await this._proRepository.findApprovedProById(proId);
    if (!existingPro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

    const updateData = this.mapToApprovedProDocument(data, existingPro);

    if (!updateData.firstName) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.FIRST_NAME_REQUIRED);
    if (!updateData.lastName) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.LAST_NAME_REQUIRED);
    if (!updateData.phoneNumber) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.PHONE_NUMBER_REQUIRED);
    if (!updateData.location) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.LOCATION_REQUIRED);
    if (!updateData.profilePhoto) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.PROFILE_PHOTO_REQUIRED);

    const updatedPro = await this._proRepository.updateApprovedPro(proId, updateData);
    if (!updatedPro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

    const profile = await this._proRepository.findApprovedProByIdAsProfile(proId);
    if (!profile) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

    try {
      await this._notificationService.createNotification({
        type: "general",
        title: "Profile Updated Successfully",
        description: "Your professional profile has been updated successfully. Your changes are now visible to customers.",
        proId: proId
      });
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_PRO_PROFILE_UPDATE_NOTIFICATION + ":", error);
    }

    return profile;
  }

  async changePassword(
    proId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<UserResponse | null> {
    const pro = await this._proRepository.findApprovedProById(proId);
    if (!pro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

    const isPasswordValid = await bcrypt.compare(data.currentPassword, pro.password);
    if (!isPasswordValid) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.INCORRECT_PASSWORD);
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);

    const updateData: Partial<ApprovedProDocument> = {
      password: hashedNewPassword,
    };

    const updatedPro = await this._proRepository.updateApprovedPro(proId, updateData);
    if (!updatedPro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

    try {
      await this._notificationService.createNotification({
        type: "general",
        title: "Password Changed Successfully",
        description: "Your password has been changed successfully. If you didn't make this change, please contact support immediately.",
        proId: proId
      });
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_PRO_PASSWORD_CHANGE_NOTIFICATION + ":", error);
    }

    return this.mapToUserResponse(updatedPro);
  }

  async getAvailability(proId: string): Promise<{ availability: IAvailability; isUnavailable: boolean }> {
    const pro = await this._proRepository.findApprovedProById(proId);
    if (!pro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
    return { availability: pro.availability || {}, isUnavailable: pro.isUnavailable };
  }

  async updateAvailability(proId: string, data: { availability: ProResponse['availability']; isUnavailable: boolean }): Promise<{ availability: ProResponse['availability']; isUnavailable: boolean }> {
    const existingPro = await this._proRepository.findApprovedProById(proId);
    if (!existingPro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

    if (data.isUnavailable) {
      const hasBookedSlots = Object.values(data.availability).some(
        (slots: any[] | undefined) => slots?.some((slot: any) => slot.booked)
      );
      if (hasBookedSlots) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.CANNOT_MARK_UNAVAILABLE_WITH_BOOKED_SLOTS);
      }
    }

    const updatedPro = await this._proRepository.updateApprovedPro(proId, { availability: data.availability, isUnavailable: data.isUnavailable });
    if (!updatedPro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

    return { availability: updatedPro.availability || {}, isUnavailable: updatedPro.isUnavailable };
  }

  async getAllCategories(): Promise<CategoryResponse[]> {
    return this._categoryRepository.getCategoriesWithPagination(0, 100);
  }

  async fetchProBookings(
    proId: string,
    page?: number,
    limit?: number,
    status?: string,
    sortBy?: "latest" | "oldest",
    search?: string,
    bookingId?: string
  ): Promise<{ bookings: BookingResponse[]; total: number }> {
    const pro = await this._proRepository.findApprovedProById(proId);
    if (!pro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
    return this._bookingRepository.fetchProBookings(proId, page, limit, status, sortBy, search, bookingId);
  }

  async getBookingById(id: string): Promise<BookingResponse> {
    const booking = await this._bookingRepository.findBookingById(id);
    if (!booking) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.BOOKING_NOT_FOUND);
    return booking as unknown as BookingResponse;
  }

  async acceptBooking(bookingId: string): Promise<{ message: string }> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const booking = await this._bookingRepository.findBookingById(bookingId);
      if (!booking) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.BOOKING_NOT_FOUND);
      if (booking.status !== "pending") throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.BOOKING_NOT_PENDING);

      const currentDateTime = new Date();
      const currentIST = new Date(currentDateTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

      const preferredDate = new Date(booking.preferredDate);
      const preferredDateIST = new Date(preferredDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

      const currentDateOnly = new Date(currentIST.getFullYear(), currentIST.getMonth(), currentIST.getDate());
      const preferredDateOnly = new Date(preferredDateIST.getFullYear(), preferredDateIST.getMonth(), preferredDateIST.getDate());

      if (preferredDateOnly < currentDateOnly) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.BOOKING_PREFERRED_DATE_PASSED);
      }

      const isPastTimeSlot = booking.preferredTime.some(slot => {
        const [hours, minutes] = slot.startTime.split(":").map(Number);
        const slotDateTime = new Date(preferredDateIST);
        slotDateTime.setHours(hours, minutes, 0, 0);
        return slotDateTime < currentIST;
      });

      if (isPastTimeSlot) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.BOOKING_PREFERRED_SLOTS_PASSED);
      }

      const pro = await this._proRepository.findApprovedProById(booking.proId.toString());
      if (!pro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

      const dayOfWeek = preferredDateIST.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
      const availableSlots = pro.availability[dayOfWeek as keyof ApprovedProDocument["availability"]] || [];

      for (const slot of booking.preferredTime) {
        const matchingSlot = availableSlots.find(
          (s) => s.startTime === slot.startTime && s.endTime === slot.endTime
        );
        if (!matchingSlot) {
          throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.FAILED_UPDATE_PRO_AVAIL_SELECTED_SLOTS);
        }
      }

      const updatedSlots = booking.preferredTime.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        booked: true,
      }));

      const availabilityUpdate = await this._proRepository.updateAvailability(pro.id, dayOfWeek, updatedSlots, true);
      if (!availabilityUpdate) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.FAILED_UPDATE_PRO_AVAILABILITY);
      }

      const conflictingBookings = await this._bookingRepository.findBookingsByProAndDate(
        pro.id,
        preferredDate,
        booking.preferredTime,
        "pending",
        bookingId
      );

      for (const conflictingBooking of conflictingBookings) {
        await this._bookingRepository.updateBooking(conflictingBooking.id, {
          status: "rejected",
          rejectedReason: "Schedule conflict",
        });
      }

      await this._bookingRepository.updateBooking(bookingId, {
        status: "accepted",
        preferredTime: updatedSlots.map((slot) => ({ ...slot })),
      });

      try {
        await this._notificationService.createNotification({
          type: "booking",
          title: "Booking Accepted! ",
          description: `Great news! ${pro.firstName} ${pro.lastName} has accepted your booking request. You'll receive a quote soon.`,
          userId: booking.userId.toString(),
          bookingId: bookingId
        });
      } catch (error) {
        console.error(MESSAGES.FAILED_SEND_BOOKING_ACCEPTANCE_NOTIFICATION + ":", error);
      }

      await session.commitTransaction();
      return { message: MESSAGES.BOOKING_ACCEPTED_SUCCESSFULLY };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async rejectBooking(bookingId: string, reason: string): Promise<{ message: string }> {
    const booking = await this._bookingRepository.findBookingById(bookingId);
    if (!booking) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.BOOKING_NOT_FOUND);
    if (booking.status !== "pending") throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.BOOKING_NOT_PENDING);

    const pro = await this._proRepository.findApprovedProById(booking.proId.toString());
    if (!pro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

    const preferredDate = new Date(booking.preferredDate);
    const dayOfWeek = preferredDate.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
    const updatedSlots = booking.preferredTime.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      booked: false,
    }));

    const availabilityUpdate = await this._proRepository.updateAvailability(pro.id, dayOfWeek, updatedSlots, false);
    if (!availabilityUpdate) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.FAILED_UPDATE_PRO_AVAILABILITY);
    }

    await this._bookingRepository.updateBooking(bookingId, {
      status: "rejected",
      rejectedReason: reason,
      preferredTime: updatedSlots.map((slot) => ({ ...slot })),
    });

    try {
      await this._notificationService.createNotification({
        type: "booking",
        title: "Booking Request Declined",
        description: `Unfortunately, your booking request has been declined. Reason: ${reason}. Please try booking with another professional.`,
        userId: booking.userId.toString(),
        bookingId: bookingId
      });
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_BOOKING_REJECTION_NOTIFICATION + ":", error);
    }

    return { message: MESSAGES.BOOKING_REJECTED_SUCCESSFULLY };
  }

  async generateQuota(bookingId: string, data: QuotaRequest): Promise<QuotaResponse> {
    const booking = await this._bookingRepository.findBookingById(bookingId);
    if (!booking) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.BOOKING_NOT_FOUND);
    if (booking.status !== "accepted") throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.BOOKING_MUST_BE_ACCEPTED_TO_GENERATE_QUOTA);

    const quotaData = {
      userId: booking.userId,
      proId: booking.proId,
      bookingId: booking._id,
      categoryId: booking.categoryId,
      laborCost: data.laborCost,
      materialCost: data.materialCost || 0,
      additionalCharges: data.additionalCharges || 0,
      totalCost: (data.laborCost || 0) + (data.materialCost || 0) + (data.additionalCharges || 0),
      paymentStatus: "pending" as const,
    };

    const quota = await this._quotaRepository.createQuota(quotaData);

    try {
      await this._notificationService.createNotification({
        type: "quota",
        title: "Quote Ready! 💰",
        description: `Your quote is ready! Total cost: ₹${quotaData.totalCost}. Please review and proceed with payment to confirm your booking.`,
        userId: booking.userId.toString(),
        quotaId: quota.id,
        bookingId: bookingId
      });
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_QUOTA_GENERATION_NOTIFICATION + ":", error);
    }

    return quota;
  }

  async fetchQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null> {
    const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
    return quota;
  }

  async getWallet(proId: string): Promise<WalletResponseDTO | null> {
    return this._walletRepository.findWalletByProId(proId);
  }

  async getWalletWithPagination(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "credit" | "debit",
    search?: string
  ): Promise<{ wallet: WalletResponseDTO | null; total: number }> {
    return this._walletRepository.findWalletByProIdAndPagination(proId, page, limit, sortBy, search);
  }

  async requestWithdrawal(
    proId: string,
    data: { amount: number; paymentMode: "bank" | "upi"; bankName?: string; accountNumber?: string; ifscCode?: string; branchName?: string; upiCode?: string; bookingId?: string }
  ): Promise<WithdrawalRequestResponse> {
    const wallet = await this._walletRepository.findWalletByProId(proId);
    if (!wallet) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.WALLET_NOT_FOUND);
    if (wallet.balance < data.amount) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.INSUFFICIENT_BALANCE);

    let bookingObjectId: mongoose.Types.ObjectId | undefined;
    let quotaObjectId: mongoose.Types.ObjectId | undefined;
    if (data.bookingId) {
      bookingObjectId = new mongoose.Types.ObjectId(data.bookingId);
      try {
        const quota = await this._quotaRepository.findQuotaByBookingId(data.bookingId);
        if (quota?.id) quotaObjectId = new mongoose.Types.ObjectId(quota.id);
      } catch { }
    }

    const withdrawalRequest = await this._withdrawalRequestRepository.createWithdrawalRequest({
      proId: new mongoose.Types.ObjectId(proId),
      amount: data.amount,
      paymentMode: data.paymentMode,
      ...(data.paymentMode === "bank" && {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        branchName: data.branchName,
      }),
      ...(data.paymentMode === "upi" && { upiCode: data.upiCode }),
      ...(bookingObjectId && { bookingId: bookingObjectId }),
      ...(quotaObjectId && { quotaId: quotaObjectId }),
      status: "pending",
    });

    try {
      await this._notificationService.createNotification({
        type: "wallet",
        title: "Withdrawal Request Submitted",
        description: `Your withdrawal request of ₹${data.amount} has been sent to the admin for review.`,
        proId: proId,
      });
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_WITHDRAWAL_SUBMISSION_NOTIFICATION + ":", error);
    }

    try {
      const admin = await this._adminRepository.find();
      if (admin) {
        await this._notificationService.createNotification({
          type: "wallet",
          title: "New Withdrawal Request",
          description: `Pro has requested a withdrawal of ₹${data.amount}. Payment mode: ${data.paymentMode.toUpperCase()}.`,
          adminId: admin.id,
        });
      }
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_WITHDRAWAL_SUBMISSION_NOTIFICATION + ":", error);
    }

    return withdrawalRequest;
  }

  async getWithdrawalRequestsByProId(proId: string): Promise<WithdrawalRequestResponse[]> {
    return this._withdrawalRequestRepository.findWithdrawalRequestsByProId(proId);
  }

  async getWithdrawalRequestsByProIdPaginated(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest",
    status?: "pending" | "approved" | "rejected"
  ): Promise<{ withdrawals: WithdrawalRequestResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const withdrawals = await this._withdrawalRequestRepository.findWithdrawalRequestsByProIdPaginated(proId, skip, limit, sortBy, status);
    // If status filter applied, total should reflect it; otherwise count all by proId
    const total = status
      ? (await this._withdrawalRequestRepository.getAllWithdrawalRequests(0, 0, sortBy, status)).filter(w => w.proId === proId).length
      : await this._withdrawalRequestRepository.getTotalWithdrawalRequestsCountByProId(proId);
    return { withdrawals, total };
  }

  private mapToApprovedProDocument(
    data: Partial<ProProfileResponse>,
    existingPro: ApprovedProDocument
  ): Partial<ApprovedProDocument> {
    return {
      firstName: data.firstName !== undefined ? data.firstName : existingPro.firstName,
      lastName: data.lastName !== undefined ? data.lastName : existingPro.lastName,
      email: existingPro.email,
      phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : existingPro.phoneNumber,
      location: data.location !== undefined ? data.location : existingPro.location,
      profilePhoto: data.profilePhoto !== undefined ? data.profilePhoto : existingPro.profilePhoto,
      about: data.about !== undefined ? data.about : existingPro.about,
      isBanned: existingPro.isBanned,
      availability: existingPro.availability,
      isUnavailable: existingPro.isUnavailable,
      categoryId: existingPro.categoryId,
    };
  }

  private mapToUserResponse(pro: ApprovedProDocument): UserResponse {
    return new UserResponse({
      id: pro.id,
      name: `${pro.firstName} ${pro.lastName}`,
      email: pro.email,
      role: UserRole.PRO,
      photo: pro.profilePhoto ?? null,
      phoneNo: pro.phoneNumber ?? null,
      address: pro.location
        ? {
          address: pro.location.address,
          city: pro.location.city,
          state: pro.location.state,
          coordinates: pro.location.coordinates,
        }
        : null,
      isBanned: pro.isBanned,
    });
  }

  async getPendingProById(pendingProId: string): Promise<PendingProResponse> {
    const pendingPro = await this._proRepository.findById(pendingProId);
    if (!pendingPro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
    const category = await this._categoryRepository.findCategoryById(pendingPro.categoryId.toString());
    if (!category) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CATEGORY_NOT_FOUND);
    return {
      _id: pendingPro._id.toString(),
      firstName: pendingPro.firstName,
      lastName: pendingPro.lastName,
      email: pendingPro.email,
      phoneNumber: pendingPro.phoneNumber,
      category: {
        id: category.id,
        name: category.name,
        image: category.image || "",
      },
      customService: pendingPro.customService,
      location: pendingPro.location,
      profilePhoto: pendingPro.profilePhoto,
      idProof: pendingPro.idProof,
      accountHolderName: pendingPro.accountHolderName,
      accountNumber: pendingPro.accountNumber,
      bankName: pendingPro.bankName,
      availability: pendingPro.availability,
      createdAt: pendingPro.createdAt,
    };
  }

  async getDashboardMetrics(proId: string): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    dailyRevenue: number;
    completedJobs: number;
    pendingJobs: number;
    averageRating: number;
    walletBalance: number;
    totalWithdrawn: number;
  }> {
    const [bookingMetrics, wallet, totalWithdrawn] = await Promise.all([
      this._bookingRepository.getProDashboardMetrics(proId),
      this._walletRepository.findWalletByProId(proId),
      this._withdrawalRequestRepository.getTotalWithdrawnByProId(proId),
    ]);

    return {
      totalRevenue: bookingMetrics.totalRevenue,
      monthlyRevenue: bookingMetrics.monthlyRevenue,
      yearlyRevenue: bookingMetrics.yearlyRevenue,
      dailyRevenue: bookingMetrics.dailyRevenue,
      completedJobs: bookingMetrics.completedJobs,
      pendingJobs: bookingMetrics.pendingJobs,
      averageRating: bookingMetrics.averageRating,
      walletBalance: wallet?.balance || 0,
      totalWithdrawn: totalWithdrawn || 0,
    };
  }

  async getMonthlyRevenueSeries(
    proId: string,
    lastNMonths?: number
  ): Promise<Array<{ year: number; month: number; revenue: number }>> {
    return this._bookingRepository.getProMonthlyRevenueSeries(proId, lastNMonths);
  }

  async getPopularCategories(
    limit: number = 2
  ): Promise<Array<{ id: string; name: string; image?: string; bookingCount: number }>> {
    const top = await this._bookingRepository.getTopCategoriesByCompleted(limit);
    return top.map((t) => ({
      id: (t as any).categoryId?.toString?.() ?? String(t.categoryId),
      name: t.name,
      image: t.image,
      bookingCount: t.bookingCount,
    }));
  }
}