import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserRepository } from "../repositories/IUserRepository";
import { IProRepository } from "../repositories/IProRepository";
import { IBookingRepository } from "../repositories/IBookingRepository";
import { IQuotaRepository } from "../repositories/IQuotaRepository";
import { IWalletRepository } from "../repositories/IWalletRepository";
import { IUserService } from "./IUserService";
import { UserResponse } from "../dtos/response/userDtos";
import { ProResponse } from "../dtos/response/proDtos";
import { BookingResponse, BookingCompleteResponse } from "../dtos/response/bookingDtos";
import { UserRole } from "../enums/roleEnum";
import { IUser } from "../models/userModel";
import { IApprovedPro, ITimeSlot } from "../models/approvedProModel";
import { IBooking } from "../models/bookingModel";
import { WalletDocument } from "../models/walletModel";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Stripe from "stripe";
import { ApprovedProDocument } from "../models/approvedProModel";
import { UpdateQuery } from "mongoose";
import { IAdminRepository } from "../repositories/IAdminRepository";
import { INotificationService } from "./INotificationService";

@injectable()
export class UserService implements IUserService {
  async getBookingById(bookingId: string): Promise<BookingCompleteResponse | null> {
    return this._bookingRepository.findBookingByIdComplete(bookingId);
  }

  async getQuotaByBookingId(bookingId: string) {
    return this._quotaRepository.findQuotaByBookingId(bookingId);
  }

  private stripe: Stripe;

  constructor(
    @inject(TYPES.IUserRepository) private _userRepository: IUserRepository,
    @inject(TYPES.IProRepository) private _proRepository: IProRepository,
    @inject(TYPES.IBookingRepository) private _bookingRepository: IBookingRepository,
    @inject(TYPES.IQuotaRepository) private _quotaRepository: IQuotaRepository,
    @inject(TYPES.IWalletRepository) private _walletRepository: IWalletRepository,
    @inject(TYPES.IAdminRepository) private _adminRepository: IAdminRepository,
    @inject(TYPES.INotificationService) private _notificationService: INotificationService
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-06-30.basil",
    });
  }
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

    // Send profile update notification
    try {
      await this._notificationService.createNotification({
        type: "general",
        title: "Profile Updated Successfully",
        description: "Your profile information has been updated successfully. Your changes are now active.",
        userId: userId
      });
    } catch (error) {
      console.error("Failed to send profile update notification:", error);
    }

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

    // Send password change notification
    try {
      await this._notificationService.createNotification({
        type: "general",
        title: "Password Changed Successfully",
        description: "Your password has been changed successfully. If you didn't make this change, please contact support immediately.",
        userId: userId
      });
    } catch (error) {
      console.error("Failed to send password change notification:", error);
    }

    return this.mapToUserResponse(updatedUser);
  }

  async getNearbyPros(
    categoryId: string, 
    longitude: number, 
    latitude: number, 
    skip: number = 0, 
    limit: number = 5, 
    sortBy: string = 'nearest', 
    availabilityFilter?: string
  ): Promise<{ pros: ProResponse[]; total: number; hasMore: boolean }> {
    return this._proRepository.findNearbyPros(categoryId, longitude, latitude, skip, limit, sortBy, availabilityFilter);
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

    const existingBookings = await this._bookingRepository.findBookingsByUserProDateTime(
      userId,
      proId,
      preferredDate,
      bookingData.preferredTime,
      "pending"
    );

    if (existingBookings.length > 0) {
      throw new HttpError(400, "You already have a booking in progress for this date and time slot. Please choose a different time.");
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

    const booking: Partial<IBooking> = {
      userId: new mongoose.Types.ObjectId(userId),
      proId: new mongoose.Types.ObjectId(proId),
      categoryId: new mongoose.Types.ObjectId(bookingData.categoryId),
      issueDescription: bookingData.issueDescription,
      location: bookingData.location,
      phoneNumber: bookingData.phoneNumber,
      preferredDate,
      preferredTime: bookingData.preferredTime, 
      status: "pending",
    };

    const createdBooking = await this._bookingRepository.createBooking(booking);

    // Send booking notification to pro
    try {
      await this._notificationService.createNotification({
        type: "booking",
        title: "New Booking Request",
        description: `You have received a new booking request from ${user.name}. Please review and respond promptly.`,
        proId: proId,
        bookingId: createdBooking.id
      });
    } catch (error) {
      console.error("Failed to send booking creation notification:", error);
    }

    return createdBooking;
  }

 async fetchBookingDetails(userId: string, page: number = 1, limit: number = 5): Promise<{ bookings: BookingResponse[]; total: number }> {
  const { bookings, total } = await this._bookingRepository.fetchBookingDetails(userId, page, limit);
  return { bookings, total };
}

 async fetchBookingHistoryDetails(userId: string, page: number = 1, limit: number = 5): Promise<{ bookings: BookingResponse[]; total: number }> {
    const { bookings, total } = await this._bookingRepository.fetchBookingHistoryDetails(userId, page, limit);
    return { bookings, total };
  }
  
  async createPaymentIntent(bookingId: string, amount: number): Promise<{ clientSecret: string }> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: "inr",
      automatic_payment_methods: { enabled: true },
      metadata: { bookingId },
    });
    if (!paymentIntent.client_secret) {
      throw new HttpError(500, "Failed to create payment intent");
    }
    return { clientSecret: paymentIntent.client_secret };
  }

  async completeBookingPayment(bookingId: string): Promise<void> {
    const booking = await this._bookingRepository.findBookingById(bookingId);
    if (!booking) throw new HttpError(404, MESSAGES.BOOKING_NOT_FOUND);

    const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
    if (!quota) throw new HttpError(404, "Quota not found");

    await this._quotaRepository.updateQuota(quota.id, { paymentStatus: "completed" });

    const proAmount = Math.round(quota.totalCost * 0.7);
    let wallet = await this._walletRepository.findWalletByProId(booking.proId.toString());
    if (!wallet) {
      wallet = await this._walletRepository.createWallet({
        proId: booking.proId,
        balance: 0,
        transactions: [],
      });
    }

    const transaction = {
      amount: proAmount,
      type: "credit" as const,
      date: new Date(),
      quotaId: new mongoose.Types.ObjectId(quota.id),
    };

    const update: UpdateQuery<WalletDocument> = {
      $set: { balance: wallet.balance + proAmount },
      $push: { transactions: transaction },
    };

    const updatedWallet = await this._walletRepository.updateWallet(wallet.id, update);

    if (!updatedWallet) {
      throw new HttpError(500, "Failed to update pro wallet");
    }

    const adminRevenue = Math.round(quota.totalCost * 0.3);


    await this._bookingRepository.updateBooking(booking.id, {
      adminRevenue: adminRevenue,
      proRevenue: proAmount
    });

    const pro = await this._proRepository.findApprovedProById(booking.proId.toString());
    if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    const preferredDate = new Date(booking.preferredDate);
    const dayOfWeek = preferredDate.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
    const availableSlots = pro.availability[dayOfWeek as keyof ApprovedProDocument["availability"]] || [];

    const updatedSlots = booking.preferredTime.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      booked: false,
    }));

    const availabilityUpdate = await this._proRepository.updateAvailability(pro.id, dayOfWeek, updatedSlots, false);
    if (!availabilityUpdate) {
      console.log("Availability update failed. Pro document:", await this._proRepository.findApprovedProById(pro.id));
      throw new HttpError(400, "Failed to update pro availability");
    }

    await this._bookingRepository.updateBooking(bookingId, {
      status: "completed",
      preferredTime: updatedSlots.map((slot) => ({ ...slot })),
    });

    try {
    
      await this._notificationService.createNotification({
        type: "wallet",
        title: "Payment Successful! ",
        description: `Your payment of ₹${quota.totalCost} has been processed successfully. Your booking is now confirmed!`,
        userId: booking.userId.toString(),
        quotaId: quota.id,
        bookingId: bookingId
      });

      await this._notificationService.createNotification({
        type: "wallet",
        title: "Payment Received! ",
        description: `Great news! You've received ₹${proAmount} for your completed service. The amount has been added to your wallet.`,
        proId: booking.proId.toString(),
        walletId: wallet.id,
        quotaId: quota.id
      });
    } catch (error) {
      console.error("Failed to send payment completion notifications:", error);
    }
  }

 async cancelBooking(userId: string, bookingId: string, cancelReason: string): Promise<{ message: string }> {
    const booking = await this._bookingRepository.findBookingById(bookingId);
    if (!booking) throw new HttpError(404, MESSAGES.BOOKING_NOT_FOUND);
    if (booking.userId.toString() !== userId) throw new HttpError(403, "Unauthorized to cancel this booking");
    if (booking.status !== "pending") throw new HttpError(400, "Only pending bookings can be cancelled");

    await this._bookingRepository.cancelBooking(bookingId, {
      status: "cancelled",
      cancelReason: cancelReason,
    });

    // Send cancellation notification to user
    try {
      await this._notificationService.createNotification({
        type: "booking",
        title: "Booking Cancelled Successfully",
        description: "Your booking has been cancelled successfully.",
        userId: userId,
        bookingId: bookingId
      });
    } catch (error) {
      console.error("Failed to send booking cancellation notification to user:", error);
    }

    // Send cancellation notification to pro
    try {
      await this._notificationService.createNotification({
        type: "booking",
        title: "Booking Cancelled",
        description: "Unfortunately, the user has decided to cancel the booking.",
        proId: booking.proId.toString(),
        bookingId: bookingId
      });
    } catch (error) {
      console.error("Failed to send booking cancellation notification to pro:", error);
    }

    return { message: "Booking cancelled successfully" };
  }
  
  async handlePaymentFailure(bookingId: string): Promise<void> {
    const booking = await this._bookingRepository.findBookingById(bookingId);
    if (!booking) throw new HttpError(404, MESSAGES.BOOKING_NOT_FOUND);

    const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
    if (quota) {
      await this._quotaRepository.updateQuota(quota.id, { paymentStatus: "failed" });
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata?.bookingId) {
          await this.completeBookingPayment(paymentIntent.metadata.bookingId);
        }
        break;
      case "payment_intent.payment_failed":
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        if (failedPaymentIntent.metadata?.bookingId) {
          await this.handlePaymentFailure(failedPaymentIntent.metadata.bookingId);
        }
        break;
      case "payment_intent.created":
        console.log(`Received payment_intent.created for PaymentIntent ${event.data.object.id}`);
        break;
      case "charge.succeeded":
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          console.log(`Charge Succeeded for PaymentIntent ${charge.payment_intent}`);
        }
        break;
      case "charge.failed":
        const failCharge = event.data.object as Stripe.Charge;
        if (failCharge.payment_intent) {
          console.log(`Charge failed for PaymentIntent ${failCharge.payment_intent}`);
        }
        break;
      case "charge.updated":
        const updatedCharge = event.data.object as Stripe.Charge;
        if (updatedCharge.payment_intent) {
          console.log(`Charge updated for PaymentIntent ${updatedCharge.payment_intent}`);
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
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