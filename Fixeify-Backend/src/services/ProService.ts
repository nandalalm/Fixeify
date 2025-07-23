import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IProRepository } from "../repositories/IProRepository";
import { ICategoryRepository } from "../repositories/ICategoryRepository";
import { IBookingRepository } from "../repositories/IBookingRepository";
import { IWithdrawalRequestRepository } from "../repositories/IWithdrawalRequestRepository";
import { IPendingPro, PendingProDocument } from "../models/pendingProModel";
import { IProService, IAvailability, ITimeSlot } from "./IProService";
import { ProProfileResponse, ProResponse, PendingProResponse } from "../dtos/response/proDtos";
import { UserResponse } from "../dtos/response/userDtos";
import { CategoryResponse } from "../dtos/response/categoryDtos";
import { BookingResponse } from "../dtos/response/bookingDtos";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import { ApprovedProDocument } from "../models/approvedProModel";
import { UserRole } from "../enums/roleEnum";
import bcrypt from "bcryptjs";
import { IQuotaRepository } from "../repositories/IQuotaRepository";
import { QuotaRequest, QuotaResponse } from "../dtos/response/quotaDtos";
import mongoose from "mongoose";
import { IWalletRepository } from "../repositories/IWalletRepository";
import { WalletResponseDTO } from "../dtos/response/walletDtos";
import { WithdrawalRequestResponse } from "../dtos/response/withdrawalDtos";

@injectable()
export class ProService implements IProService {
  constructor(
    @inject(TYPES.IProRepository) private _proRepository: IProRepository,
    @inject(TYPES.ICategoryRepository) private _categoryRepository: ICategoryRepository,
    @inject(TYPES.IBookingRepository) private _bookingRepository: IBookingRepository,
    @inject(TYPES.IQuotaRepository) private _quotaRepository: IQuotaRepository,
    @inject(TYPES.IWalletRepository) private _walletRepository: IWalletRepository,
    @inject(TYPES.IWithdrawalRequestRepository) private _withdrawalRequestRepository: IWithdrawalRequestRepository
  ) {}

  async applyPro(proData: Partial<IPendingPro>): Promise<{ message: string; pendingPro: IPendingPro }> {
    const existingPending = await this._proRepository.findPendingProByEmail(proData.email!);
    const existingApproved = await this._proRepository.findApprovedProByEmail(proData.email!);

    if (existingPending && !existingPending.isRejected) {
      throw new HttpError(400, MESSAGES.APPLICATION_ALREADY_PENDING);
    }

     if (existingApproved) {
      throw new HttpError(400, MESSAGES.APPLICATION_ALREADY_APPROVED);
    }

    let pendingPro: PendingProDocument;

    if (existingPending && existingPending.isRejected) {
      const updatedPro = await this._proRepository.updatePendingPro(existingPending._id.toString(), {
        ...proData,
        isRejected: false,
        createdAt: new Date(),
      });
      if (!updatedPro) {
        throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
      }
      pendingPro = updatedPro;
    } else {
      pendingPro = await this._proRepository.createPendingPro(proData);
    }

    return { message: MESSAGES.APPLICATION_SUBMITTED_SUCCESSFULLY, pendingPro };
  }
  
  async getProfile(proId: string): Promise<ProProfileResponse> {
    const pro = await this._proRepository.findApprovedProByIdAsProfile(proId);
    if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
    return pro;
  }

  async updateProfile(proId: string, data: Partial<ProProfileResponse>): Promise<ProProfileResponse> {
    const existingPro = await this._proRepository.findApprovedProById(proId);
    if (!existingPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    const updateData = this.mapToApprovedProDocument(data, existingPro);

    if (!updateData.firstName) throw new HttpError(400, MESSAGES.FIRST_NAME_REQUIRED);
    if (!updateData.lastName) throw new HttpError(400, MESSAGES.LAST_NAME_REQUIRED);
    if (!updateData.phoneNumber) throw new HttpError(400, MESSAGES.PHONE_NUMBER_REQUIRED);
    if (!updateData.location) throw new HttpError(400, MESSAGES.LOCATION_REQUIRED);
    if (!updateData.profilePhoto) throw new HttpError(400, MESSAGES.PROFILE_PHOTO_REQUIRED);

    const updatedPro = await this._proRepository.updateApprovedPro(proId, updateData);
    if (!updatedPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    const profile = await this._proRepository.findApprovedProByIdAsProfile(proId);
    if (!profile) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
    return profile;
  }

  async changePassword(
    proId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<UserResponse | null> {
    const pro = await this._proRepository.findApprovedProById(proId);
    if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    const isPasswordValid = await bcrypt.compare(data.currentPassword, pro.password);
    if (!isPasswordValid) {
      throw new HttpError(400, MESSAGES.INCORRECT_PASSWORD);
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);

    const updateData: Partial<ApprovedProDocument> = {
      password: hashedNewPassword,
    };

    const updatedPro = await this._proRepository.updateApprovedPro(proId, updateData);
    if (!updatedPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    return this.mapToUserResponse(updatedPro);
  }

  async getAvailability(proId: string): Promise<{ availability: IAvailability; isUnavailable: boolean }> {
    const pro = await this._proRepository.findApprovedProById(proId);
    if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
    return { availability: pro.availability || {}, isUnavailable: pro.isUnavailable };
  }

  async updateAvailability(proId: string, data: { availability: ProResponse['availability']; isUnavailable: boolean }): Promise<{ availability: ProResponse['availability']; isUnavailable: boolean }> {
    const existingPro = await this._proRepository.findApprovedProById(proId);
    if (!existingPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    if (data.isUnavailable) {
      const hasBookedSlots = Object.values(data.availability).some(
        (slots: any[] | undefined) => slots?.some((slot: any) => slot.booked)
      );
      if (hasBookedSlots) {
        throw new HttpError(400, "Cannot mark as unavailable while there are booked slots");
      }
    }

    const updatedPro = await this._proRepository.updateApprovedPro(proId, { availability: data.availability, isUnavailable: data.isUnavailable });
    if (!updatedPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    return { availability: updatedPro.availability || {}, isUnavailable: updatedPro.isUnavailable };
  }

  async getAllCategories(): Promise<CategoryResponse[]> {
    return this._categoryRepository.getCategoriesWithPagination(0, 100);
  }

  async fetchProBookings(proId: string, page?: number, limit?: number, status?: string): Promise<{ bookings: BookingResponse[]; total: number }> {
  const pro = await this._proRepository.findApprovedProById(proId);
  if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
  return this._bookingRepository.fetchProBookings(proId, page, limit, status);
}

  async acceptBooking(bookingId: string): Promise<{ message: string }> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const booking = await this._bookingRepository.findBookingById(bookingId);
      if (!booking) throw new HttpError(404, MESSAGES.BOOKING_NOT_FOUND);
      if (booking.status !== "pending") throw new HttpError(400, MESSAGES.BOOKING_NOT_PENDING);

      const currentDateTime = new Date();
      const currentIST = new Date(currentDateTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

      const preferredDate = new Date(booking.preferredDate);
      const preferredDateIST = new Date(preferredDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

      const currentDateOnly = new Date(currentIST.getFullYear(), currentIST.getMonth(), currentIST.getDate());
      const preferredDateOnly = new Date(preferredDateIST.getFullYear(), preferredDateIST.getMonth(), preferredDateIST.getDate());

      if (preferredDateOnly < currentDateOnly) {
        throw new HttpError(400, "This booking cannot be accepted as the preferred date has passed.");
      }

      const isPastTimeSlot = booking.preferredTime.some(slot => {
        const [hours, minutes] = slot.startTime.split(":").map(Number);
        const slotDateTime = new Date(preferredDateIST);
        slotDateTime.setHours(hours, minutes, 0, 0);
        return slotDateTime < currentIST;
      });

      if (isPastTimeSlot) {
        throw new HttpError(400, "This booking cannot be accepted as one or more preferred time slots have passed.");
      }

      const pro = await this._proRepository.findApprovedProById(booking.proId.toString());
      if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

      const dayOfWeek = preferredDateIST.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
      const availableSlots = pro.availability[dayOfWeek as keyof ApprovedProDocument["availability"]] || [];

      for (const slot of booking.preferredTime) {
        const matchingSlot = availableSlots.find(
          (s) => s.startTime === slot.startTime && s.endTime === slot.endTime
        );
        if (!matchingSlot) {
          throw new HttpError(400, `Time slot ${slot.startTime}-${slot.endTime} is not available`);
        }
        if (matchingSlot.booked) {
          throw new HttpError(400, `Time slot ${slot.startTime}-${slot.endTime} is already booked`);
        }
      }

      const updatedSlots = booking.preferredTime.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        booked: true,
      }));

      const availabilityUpdate = await this._proRepository.updateAvailability(pro.id, dayOfWeek, updatedSlots, true);
      if (!availabilityUpdate) {
        console.log("Availability update failed. Pro document:", await this._proRepository.findApprovedProById(pro.id));
        throw new HttpError(400, "Failed to update pro availability");
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
    if (!booking) throw new HttpError(404, MESSAGES.BOOKING_NOT_FOUND);
    if (booking.status !== "pending") throw new HttpError(400, MESSAGES.BOOKING_NOT_PENDING);

    await this._bookingRepository.updateBooking(bookingId, {
      status: "rejected",
      rejectedReason: reason,
    });

    return { message: MESSAGES.BOOKING_REJECTED_SUCCESSFULLY };
  }

  async generateQuota(bookingId: string, data: QuotaRequest): Promise<QuotaResponse> {
    const booking = await this._bookingRepository.findBookingById(bookingId);
    if (!booking) throw new HttpError(404, MESSAGES.BOOKING_NOT_FOUND);
    if (booking.status !== "accepted") throw new HttpError(400, "Booking must be accepted to generate quota");

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
    return quota;
  }

  async fetchQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null> {
    const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
    return quota;
  }

 async getWallet(proId: string): Promise<WalletResponseDTO | null> {
    return this._walletRepository.findWalletByProId(proId);
  }

  async getWalletWithPagination(proId: string, page: number, limit: number): Promise<{ wallet: WalletResponseDTO | null; total: number }> {
    return this._walletRepository.findWalletByProIdAndPagination(proId, page, limit);
  }
  
  async requestWithdrawal(proId: string, data: { amount: number; paymentMode: "bank" | "upi"; bankName?: string; accountNumber?: string; ifscCode?: string; branchName?: string; upiCode?: string }): Promise<WithdrawalRequestResponse> {
    const wallet = await this._walletRepository.findWalletByProId(proId);
    if (!wallet) throw new HttpError(404, MESSAGES.WALLET_NOT_FOUND);
    if (wallet.balance < data.amount) throw new HttpError(400, MESSAGES.INSUFFICIENT_BALANCE);

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
      status: "pending",
    });

    return withdrawalRequest;
  }

  async getWithdrawalRequestsByProId(proId: string): Promise<WithdrawalRequestResponse[]> {
    return this._withdrawalRequestRepository.findWithdrawalRequestsByProId(proId);
  }

  private mapToApprovedProDocument(data: Partial<ProProfileResponse>, existingPro: ApprovedProDocument): Partial<ApprovedProDocument> {
    return {
      firstName: data.firstName !== undefined ? data.firstName : existingPro.firstName,
      lastName: data.lastName !== undefined ? data.lastName : existingPro.lastName,
      email: existingPro.email,
      phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : existingPro.phoneNumber,
      location: data.location !== undefined ? data.location : existingPro.location,
      profilePhoto: data.profilePhoto !== undefined ? data.profilePhoto : existingPro.profilePhoto,
      about: data.about !== undefined ? data.about : existingPro.about,
      isBanned: existingPro.isBanned,
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
  if (!pendingPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
  const category = await this._categoryRepository.findCategoryById(pendingPro.categoryId.toString());
  if (!category) throw new HttpError(404, MESSAGES.CATEGORY_NOT_FOUND);
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
}