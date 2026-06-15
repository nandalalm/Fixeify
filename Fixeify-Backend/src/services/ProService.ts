import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import logger from "../config/logger";
import type { IProRepository } from "../repositories/IProRepository";
import type { ICategoryRepository } from "../repositories/ICategoryRepository";
import type { IBookingRepository } from "../repositories/IBookingRepository";
import type { IWithdrawalRequestRepository } from "../repositories/IWithdrawalRequestRepository";
import type { IPendingPro, PendingProDocument } from "../models/pendingProModel";
import type { IProService, IAvailability } from "./IProService";
import type { ProProfileResponse, ProResponse, PendingProResponse } from "../dtos/response/proDtos";
import type { UserResponse } from "../dtos/response/userDtos";
import type { CategoryResponse } from "../dtos/response/categoryDtos";
import type { BookingResponse } from "../dtos/response/bookingDtos";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";
import type { ApprovedProDocument } from "../models/approvedProModel";
import bcrypt from "bcryptjs";
import type { IQuotaRepository } from "../repositories/IQuotaRepository";
import type { QuotaResponse } from "../dtos/response/quotaDtos";
import type { QuotaRequest } from "../dtos/request/quotaDtos";
import mongoose from "mongoose";
import type { IWalletRepository } from "../repositories/IWalletRepository";
import type { IAdminRepository } from "../repositories/IAdminRepository";
import type { WalletResponse } from "../dtos/response/walletDtos";
import type { WithdrawalResponse } from "../dtos/response/withdrawalDtos";
import type { INotificationService } from "./INotificationService";
import { scheduleSlotRelease, cancelSlotRelease } from "./queue/SlotReleaseQueue";
import { toProUserResponse } from "../mappers/userMapper";
import { toCategoryResponses } from "../mappers/categoryMapper";
import { toPendingProResponse, toProProfileResponse } from "../mappers/proMapper";
import { toBookingResponse } from "../mappers/bookingMapper";
import { toQuotaResponse } from "../mappers/quotaMapper";
import { toWalletResponse } from "../mappers/walletMapper";
import { toWithdrawalResponse, toWithdrawalResponses } from "../mappers/withdrawalMapper";

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

    try {
      const admin = await this._adminRepository.find();
      if (admin) {
        await this._notificationService.createNotification({
          type: MESSAGES.NOTIFICATION_TYPE_GENERAL,
          title: MESSAGES.NOTIFICATION_TITLE_NEW_PRO_APPLICATION_RECEIVED,
          description: `${proData.firstName ?? ""} ${proData.lastName ?? ""} (${proData.email ?? MESSAGES.NOTIFICATION_DESC_NEW_PRO_APPLICATION_EMAIL_FALLBACK}) ${MESSAGES.NOTIFICATION_DESC_NEW_PRO_APPLICATION_SUFFIX}`,
          adminId: admin.id,
        });
      }
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_PRO_APPLICATION_NOTIFICATION, { proData: { firstName: proData.firstName, lastName: proData.lastName, email: proData.email }, error });
    }

    return { message: MESSAGES.APPLICATION_SUBMITTED_SUCCESSFULLY, pendingPro };
  }

  async getProfile(proId: string): Promise<ProProfileResponse> {
    const pro = await this._proRepository.findApprovedProProfileById(proId);
    if (!pro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
    return toProProfileResponse(pro);
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

    const profile = await this._proRepository.findApprovedProProfileById(proId);
    if (!profile) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);

    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_GENERAL,
        title: MESSAGES.NOTIFICATION_TITLE_PROFILE_UPDATED,
        description: MESSAGES.NOTIFICATION_DESC_PRO_PROFILE_UPDATED,
        proId: proId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_PRO_PROFILE_UPDATE_NOTIFICATION, { proId, error });
    }

    return toProProfileResponse(profile);
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
        type: MESSAGES.NOTIFICATION_TYPE_GENERAL,
        title: MESSAGES.NOTIFICATION_TITLE_PASSWORD_CHANGED,
        description: MESSAGES.NOTIFICATION_DESC_PASSWORD_CHANGED,
        proId: proId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_PRO_PASSWORD_CHANGE_NOTIFICATION, { proId, error });
    }

    return toProUserResponse(updatedPro);
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
        (slots: { startTime: string; endTime: string; booked: boolean }[] | undefined) => slots?.some((slot) => slot.booked)
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
    const categories = await this._categoryRepository.getCategoriesWithPagination(0, 100);
    return toCategoryResponses(categories);
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
    const { bookings, total } = await this._bookingRepository.fetchProBookings(proId, page, limit, status, sortBy, search, bookingId);
    return { bookings: bookings.map(toBookingResponse), total };
  }

  async getBookingById(id: string): Promise<BookingResponse> {
    const booking = await this._bookingRepository.findBookingByIdPopulated(id);
    if (!booking) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.BOOKING_NOT_FOUND);
    return toBookingResponse(booking);
  }

  async acceptBooking(bookingId: string): Promise<{ message: string }> {
    const session = await mongoose.startSession();
    let acceptedBooking: { userId: string; slotReleaseAt: Date } | null = null;
    try {
      session.startTransaction();
      const booking = await this._bookingRepository.findBookingById(bookingId, session);
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

      const pro = await this._proRepository.findApprovedProById(booking.proId.toString(), session);
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

      const availabilityUpdate = await this._proRepository.updateAvailability(pro.id, dayOfWeek, updatedSlots, true, session);
      if (!availabilityUpdate) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.FAILED_UPDATE_PRO_AVAILABILITY);
      }

      const conflictingBookings = await this._bookingRepository.findBookingsByProAndDate(
        pro.id,
        preferredDate,
        booking.preferredTime,
        "pending",
        bookingId,
        session
      );

      for (const conflictingBooking of conflictingBookings) {
        await this._bookingRepository.updateBooking(conflictingBooking._id.toString(), {
          status: "rejected",
          rejectedReason: MESSAGES.SCHEDULE_CONFLICT,
        }, session);
      }

      await this._bookingRepository.updateBooking(bookingId, {
        status: "accepted",
        preferredTime: updatedSlots.map((slot) => ({ ...slot })),
      }, session);

      const toMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const lastEndMinutes = booking.preferredTime
        .map(s => toMinutes(s.endTime))
        .reduce((max, cur) => (cur > max ? cur : max), 0);
      const endH = Math.floor(lastEndMinutes / 60);
      const endM = lastEndMinutes % 60;
      const preferredDateIST2 = new Date(preferredDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      preferredDateIST2.setHours(endH, endM, 0, 0);
      const runAt = new Date(preferredDateIST2.toISOString());
      await this._bookingRepository.updateBooking(
        bookingId,
        { slotReleaseJobId: null, slotReleaseAt: runAt },
        session
      );

      acceptedBooking = {
        userId: booking.userId.toString(),
        slotReleaseAt: runAt,
      };
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    if (!acceptedBooking) {
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.SERVER_ERROR);
    }

    try {
      const scheduled = await scheduleSlotRelease(bookingId, acceptedBooking.slotReleaseAt);
      if (scheduled) {
        await this._bookingRepository.updateBooking(bookingId, { slotReleaseJobId: bookingId });
      } else {
        logger.error(MESSAGES.FAILED_SCHEDULE_SLOT_RELEASE, { bookingId });
      }
    } catch (error) {
      logger.error(MESSAGES.FAILED_SCHEDULE_SLOT_RELEASE, { bookingId, error });
    }

    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_BOOKING,
        title: MESSAGES.NOTIFICATION_TITLE_BOOKING_ACCEPTED,
        description: MESSAGES.NOTIFICATION_DESC_BOOKING_ACCEPTED,
        userId: acceptedBooking.userId,
        bookingId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_BOOKING_ACCEPTANCE_NOTIFICATION, {
        bookingId,
        userId: acceptedBooking.userId,
        error
      });
    }

    return { message: MESSAGES.BOOKING_ACCEPTED_SUCCESSFULLY };
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

    try { await cancelSlotRelease(bookingId); } catch (error) {
      logger.error(MESSAGES.FAILED_CANCEL_SLOT_RELEASE, { bookingId, error });
    }
    await this._bookingRepository.updateBooking(bookingId, { slotReleaseJobId: null });

    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_BOOKING,
        title: MESSAGES.NOTIFICATION_TITLE_BOOKING_REQUEST_DECLINED,
        description: `${MESSAGES.NOTIFICATION_DESC_BOOKING_REJECTED_PREFIX} ${reason}. ${MESSAGES.NOTIFICATION_DESC_BOOKING_REJECTED_SUFFIX}`,
        userId: booking.userId.toString(),
        bookingId: bookingId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_BOOKING_REJECTION_NOTIFICATION, { bookingId, userId: booking.userId.toString(), reason, error });
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
    const quotaResponse = toQuotaResponse(quota);

    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_BOOKING,
        title: MESSAGES.NOTIFICATION_TITLE_QUOTA_GENERATED,
        description: MESSAGES.NOTIFICATION_DESC_QUOTA_GENERATED,
        userId: booking.userId.toString(),
        quotaId: quota._id.toString(),
        bookingId: bookingId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_QUOTA_GENERATION_NOTIFICATION, { bookingId, quotaId: quota._id.toString(), userId: booking.userId.toString(), error });
    }

    return quotaResponse;
  }

  async fetchQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null> {
    const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
    return quota ? toQuotaResponse(quota) : null;
  }

  async getWallet(proId: string): Promise<WalletResponse | null> {
    const wallet = await this._walletRepository.findWalletByProId(proId);
    return wallet ? toWalletResponse(wallet) : null;
  }

  async getWalletWithPagination(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "credit" | "debit",
    search?: string
  ): Promise<{ wallet: WalletResponse | null; total: number }> {
    const { wallet, total } = await this._walletRepository.findWalletByProIdAndPagination(proId, page, limit, sortBy, search);
    return { wallet: wallet ? toWalletResponse(wallet) : null, total };
  }

  async requestWithdrawal(
    proId: string,
    data: { amount: number; paymentMode: "bank" | "upi"; bankName?: string; accountNumber?: string; ifscCode?: string; branchName?: string; upiCode?: string; bookingId?: string }
  ): Promise<WithdrawalResponse> {
    const wallet = await this._walletRepository.findWalletByProId(proId);
    if (!wallet) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.WALLET_NOT_FOUND);
    if (wallet.balance < data.amount) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.INSUFFICIENT_BALANCE);

    let bookingObjectId: mongoose.Types.ObjectId | undefined;
    let quotaObjectId: mongoose.Types.ObjectId | undefined;
    if (data.bookingId) {
      bookingObjectId = new mongoose.Types.ObjectId(data.bookingId);
      try {
        const quota = await this._quotaRepository.findQuotaByBookingId(data.bookingId);
        if (quota?._id) quotaObjectId = new mongoose.Types.ObjectId(quota._id);
      } catch (error) {
        logger.error(MESSAGES.FAILED_LOOKUP_QUOTA_FOR_WITHDRAWAL, { bookingId: data.bookingId, error });
      }
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
        type: MESSAGES.NOTIFICATION_TYPE_WALLET,
        title: MESSAGES.NOTIFICATION_TITLE_WITHDRAWAL_REQUEST_SUBMITTED,
        description: `${MESSAGES.NOTIFICATION_DESC_WITHDRAWAL_SUBMITTED_PREFIX} ${MESSAGES.CURRENCY_INR}${data.amount} ${MESSAGES.NOTIFICATION_DESC_WITHDRAWAL_SUBMITTED_SUFFIX}`,
        proId: proId,
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_WITHDRAWAL_SUBMISSION_NOTIFICATION, { proId, amount: data.amount, error });
    }

    try {
      const admin = await this._adminRepository.find();
      if (admin) {
        await this._notificationService.createNotification({
          type: MESSAGES.NOTIFICATION_TYPE_WALLET,
          title: MESSAGES.NOTIFICATION_TITLE_NEW_WITHDRAWAL_REQUEST,
          description: `${MESSAGES.NOTIFICATION_DESC_ADMIN_WITHDRAWAL_REQUEST_PREFIX} ${MESSAGES.CURRENCY_INR}${data.amount}. ${MESSAGES.NOTIFICATION_DESC_ADMIN_WITHDRAWAL_REQUEST_PAYMENT_MODE_PREFIX} ${data.paymentMode.toUpperCase()}.`,
          adminId: admin.id,
        });
      }
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_ADMIN_WITHDRAWAL_NOTIFICATION, { proId, amount: data.amount, paymentMode: data.paymentMode, error });
    }

    return toWithdrawalResponse(withdrawalRequest);
  }

  async getWithdrawalRequestsByProId(proId: string): Promise<WithdrawalResponse[]> {
    const withdrawals = await this._withdrawalRequestRepository.findWithdrawalRequestsByProId(proId);
    return toWithdrawalResponses(withdrawals);
  }

  async getWithdrawalRequestsByProIdPaginated(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest",
    status?: "pending" | "approved" | "rejected"
  ): Promise<{ withdrawals: WithdrawalResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const withdrawals = await this._withdrawalRequestRepository.findWithdrawalRequestsByProIdPaginated(proId, skip, limit, sortBy, status);
    const total = status
      ? (await this._withdrawalRequestRepository.getAllWithdrawalRequests(0, 0, sortBy, status)).filter(w => w.proId.toString() === proId).length
      : await this._withdrawalRequestRepository.getTotalWithdrawalRequestsCountByProId(proId);
    return { withdrawals: toWithdrawalResponses(withdrawals), total };
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
  async getPendingProById(pendingProId: string): Promise<PendingProResponse> {
    const pendingPro = await this._proRepository.findById(pendingProId);
    if (!pendingPro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
    const category = await this._categoryRepository.findCategoryById(pendingPro.categoryId.toString());
    if (!category) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CATEGORY_NOT_FOUND);
    return toPendingProResponse(pendingPro, category);
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
      id: (t as { categoryId: unknown }).categoryId?.toString?.() ?? String((t as { categoryId: unknown }).categoryId),
      name: t.name,
      image: t.image,
      bookingCount: t.bookingCount,
    }));
  }
}
