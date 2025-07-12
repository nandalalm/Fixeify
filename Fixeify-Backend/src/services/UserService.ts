import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserRepository } from "../repositories/IUserRepository";
import { IProRepository } from "../repositories/IProRepository";
import { IBookingRepository } from "../repositories/IBookingRepository";
import { IUserService } from "./IUserService";
import { UserResponse } from "../dtos/response/userDtos";
import { ProResponse } from "../dtos/response/proDtos";
import { BookingResponse } from "../dtos/response/bookingDtos";
import { UserRole } from "../enums/roleEnum";
import { IUser } from "../models/userModel";
import { IApprovedPro, ITimeSlot } from "../models/approvedProModel";
import { IBooking } from "../models/bookingModel";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

@injectable()
export class UserService implements IUserService {
  constructor(
    @inject(TYPES.IUserRepository) private _userRepository: IUserRepository,
    @inject(TYPES.IProRepository) private _proRepository: IProRepository,
    @inject(TYPES.IBookingRepository) private _bookingRepository: IBookingRepository
  ) {}

  async getUserProfile(userId: string): Promise<UserResponse | null> {
    const user = await this._userRepository.findUserById(userId);
    if (!user) return null;
    return this.mapToUserResponse(user);
  }

  async updateUserProfile(
    userId: string,
    data: {
      name: string;
      email?: string;
      phoneNo: string | null;
      address?: {
        address: string;
        city: string;
        state: string;
        coordinates: { type: "Point"; coordinates: [number, number] };
      } | null;
      photo?: string | null;
    }
  ): Promise<UserResponse | null> {
    const user = await this._userRepository.findUserById(userId);
    if (!user) return null;

    const updateData: Partial<IUser> = {
      name: data.name || user.name,
      email: user.email,
      phoneNo: data.phoneNo !== undefined ? data.phoneNo : user.phoneNo,
      address: data.address !== undefined ? data.address : user.address,
      photo: data.photo !== undefined ? data.photo : user.photo,
    };

    const updatedUser = await this._userRepository.updateUser(userId, updateData);
    if (!updatedUser) return null;

    return this.mapToUserResponse(updatedUser);
  }

  async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<UserResponse | null> {
    const user = await this._userRepository.findUserById(userId);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new HttpError(400, MESSAGES.INCORRECT_PASSWORD);
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);

    const updateData: Partial<IUser> = {
      password: hashedNewPassword,
    };

    const updatedUser = await this._userRepository.updateUser(userId, updateData);
    if (!updatedUser) return null;

    return this.mapToUserResponse(updatedUser);
  }

  async getNearbyPros(categoryId: string, longitude: number, latitude: number): Promise<ProResponse[]> {
    return this._proRepository.findNearbyPros(categoryId, longitude, latitude);
  }

  async createBooking(
    userId: string,
    proId: string,
    bookingData: {
      categoryId: string;
      issueDescription: string;
      location: {
        address: string;
        city: string;
        state: string;
        coordinates: { type: "Point"; coordinates: [number, number] };
      };
      phoneNumber: string;
      preferredDate: Date;
      preferredTime: ITimeSlot[];
    }
  ): Promise<BookingResponse> {
    const user = await this._userRepository.findUserById(userId);
    if (!user) throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
    if (user.isBanned) throw new HttpError(403, MESSAGES.ACCOUNT_BANNED);

    const pro = await this._proRepository.findApprovedProById(proId);
    if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
    if (pro.isBanned) throw new HttpError(403, MESSAGES.ACCOUNT_BANNED);
    if (pro.isUnavailable) throw new HttpError(400, "Professional is currently unavailable");

    const preferredDate = new Date(bookingData.preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (preferredDate < today) {
      throw new HttpError(400, "Preferred date cannot be in the past");
    }

    const dayOfWeek = preferredDate.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
    const availableSlots = pro.availability[dayOfWeek as keyof IApprovedPro["availability"]] || [];

    for (const selectedSlot of bookingData.preferredTime) {
      const slotExists = availableSlots.some(
        (slot) =>
          slot.startTime === selectedSlot.startTime &&
          slot.endTime === selectedSlot.endTime
      );
      if (!slotExists) {
        throw new HttpError(400, `Time slot ${selectedSlot.startTime}-${selectedSlot.endTime} is not available`);
      }
      if (availableSlots.find(
        (slot) =>
          slot.startTime === selectedSlot.startTime &&
          slot.endTime === selectedSlot.endTime &&
          slot.booked
      )) {
        throw new HttpError(400, `Time slot ${selectedSlot.startTime}-${selectedSlot.endTime} is already booked`);
      }
    }

    const updatedSlots = bookingData.preferredTime.map(slot => ({ ...slot, booked: true }));
    const updateResult = await this._proRepository.updateAvailability(proId, dayOfWeek, updatedSlots,true);
    
    if (!updateResult) {
      throw new HttpError(400, "Failed to reserve time slots. Some slots may be booked by another user.");
    }

    const booking: Partial<IBooking> = {
      userId: new mongoose.Types.ObjectId(userId),
      proId: new mongoose.Types.ObjectId(proId),
      categoryId: new mongoose.Types.ObjectId(bookingData.categoryId),
      issueDescription: bookingData.issueDescription,
      location: bookingData.location,
      phoneNumber: bookingData.phoneNumber,
      preferredDate,
      preferredTime: updatedSlots,
      status: "pending",
    };

    return await this._bookingRepository.createBooking(booking);
  }

  async fetchBookingDetails(userId: string): Promise<BookingResponse[]> {
    const bookings = await this._bookingRepository.fetchBookingDetails(userId);
    return bookings;
  }

  private mapToUserResponse(user: IUser): UserResponse {
    return new UserResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: UserRole.USER,
      photo: user.photo ?? null,
      phoneNo: user.phoneNo ?? null,
      address: user.address
        ? {
            address: user.address.address,
            city: user.address.city,
            state: user.address.state,
            coordinates: user.address.coordinates,
          }
        : null,
      isBanned: user.isBanned,
    });
  }
}