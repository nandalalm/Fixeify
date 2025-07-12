import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IProRepository } from "../repositories/IProRepository";
import { ICategoryRepository } from "../repositories/ICategoryRepository";
import { IBookingRepository } from "../repositories/IBookingRepository";
import { IPendingPro } from "../models/pendingProModel";
import { IProService, IAvailability, ITimeSlot } from "./IProService";
import { ProProfileResponse } from "../dtos/response/proDtos";
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

@injectable()
export class ProService implements IProService {
  constructor(
    @inject(TYPES.IProRepository) private _proRepository: IProRepository,
    @inject(TYPES.ICategoryRepository) private _categoryRepository: ICategoryRepository,
    @inject(TYPES.IBookingRepository) private _bookingRepository: IBookingRepository,
    @inject(TYPES.IQuotaRepository) private _quotaRepository: IQuotaRepository
  ) {}

  async applyPro(proData: Partial<IPendingPro>): Promise<{ message: string; pendingPro: IPendingPro }> {
    const existingPending = await this._proRepository.findPendingProByEmail(proData.email!);
    if (existingPending) throw new HttpError(400, MESSAGES.APPLICATION_ALREADY_PENDING);
    const pendingPro = await this._proRepository.createPendingPro(proData);
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

  async updateAvailability(proId: string, data: { availability: IAvailability; isUnavailable: boolean }): Promise<{ availability: IAvailability; isUnavailable: boolean }> {
    const existingPro = await this._proRepository.findApprovedProById(proId);
    if (!existingPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    const updatedPro = await this._proRepository.updateApprovedPro(proId, { availability: data.availability, isUnavailable: data.isUnavailable });
    if (!updatedPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    return { availability: updatedPro.availability || {}, isUnavailable: updatedPro.isUnavailable };
  }

  async getAllCategories(): Promise<CategoryResponse[]> {
    return this._categoryRepository.getCategoriesWithPagination(0, 100);
  }

  async fetchProBookings(proId: string): Promise<BookingResponse[]> {
    const pro = await this._proRepository.findApprovedProById(proId);
    if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
    return this._bookingRepository.fetchProBookings(proId);
  }

  async acceptBooking(bookingId: string): Promise<{ message: string }> {
    const booking = await this._bookingRepository.findBookingById(bookingId);
    if (!booking) throw new HttpError(404, MESSAGES.BOOKING_NOT_FOUND);
    if (booking.status !== "pending") throw new HttpError(400, MESSAGES.BOOKING_NOT_PENDING);

    await this._bookingRepository.updateBooking(bookingId, { status: "accepted" });
    return { message: MESSAGES.BOOKING_ACCEPTED_SUCCESSFULLY };
  }

  async rejectBooking(bookingId: string, reason: string): Promise<{ message: string }> {
    const booking = await this._bookingRepository.findBookingById(bookingId);
    if (!booking) throw new HttpError(404, MESSAGES.BOOKING_NOT_FOUND);
    if (booking.status !== "pending") throw new HttpError(400, MESSAGES.BOOKING_NOT_PENDING);

    const pro = await this._proRepository.findApprovedProById(booking.proId.toString());
    if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    const preferredDate = new Date(booking.preferredDate);
    const dayOfWeek = preferredDate.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
    const availableSlots = pro.availability[dayOfWeek as keyof ApprovedProDocument["availability"]] || [];

    const updatedSlots = booking.preferredTime.map((slot) => {
      const matchingSlot = availableSlots.find((s) => s.startTime === slot.startTime && s.endTime === slot.endTime);
      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        booked: false,
      };
    });

    const availabilityUpdate = await this._proRepository.updateAvailability(pro.id, dayOfWeek, updatedSlots, false);
    if (!availabilityUpdate) {
      console.log("Availability update failed. Pro document:", await this._proRepository.findApprovedProById(pro.id));
      throw new HttpError(400, "Failed to update pro availability");
    }

    await this._bookingRepository.updateBooking(bookingId, {
      status: "rejected",
      rejectedReason: reason,
      preferredTime: updatedSlots.map((slot) => ({ ...slot })),
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
}