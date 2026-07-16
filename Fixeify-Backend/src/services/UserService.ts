import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import logger from "../config/logger";
import type { IUserRepository } from "../repositories/IUserRepository";
import type { IProRepository } from "../repositories/IProRepository";
import type { IBookingRepository } from "../repositories/IBookingRepository";
import type { IQuotaRepository } from "../repositories/IQuotaRepository";
import type { IWalletRepository } from "../repositories/IWalletRepository";
import type { IUserService } from "./IUserService";
import type { UserResponse } from "../dtos/response/userDtos";
import type { ProResponse } from "../dtos/response/proDtos";
import type { BookingResponse, BookingCompleteResponse } from "../dtos/response/bookingDtos";
import type { IUser } from "../models/userModel";
import type { IApprovedPro, ITimeSlot } from "../models/approvedProModel";
import type { IBooking } from "../models/bookingModel";
import type { WalletDocument } from "../models/walletModel";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Stripe from "stripe";
import type { IAdminRepository } from "../repositories/IAdminRepository";
import type { INotificationService } from "./INotificationService";
import RedisConnector from "../config/redisConnector";
import type { ITransactionRepository } from "../repositories/ITransactionRepository";
import { cancelSlotRelease, scheduleSlotRelease } from "./queue/SlotReleaseQueue";
import { toUserProfileResponse } from "../mappers/userMapper";
import { toNearbyProResponse } from "../mappers/proMapper";
import { toBookingCompleteResponse, toBookingResponse } from "../mappers/bookingMapper";
import { toQuotaResponse } from "../mappers/quotaMapper";
import type { QuotaResponse } from "../dtos/response/quotaDtos";
import PaymentEventModel from "../models/paymentEventModel";

const IST_OFFSET_MINUTES = 330;

const getSlotEndDateInIST = (preferredDate: Date, endMinutes: number): Date => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(preferredDate);

  let year = 0;
  let month = 0;
  let day = 0;

  for (const part of parts) {
    if (part.type === "year") year = Number(part.value);
    if (part.type === "month") month = Number(part.value);
    if (part.type === "day") day = Number(part.value);
  }

  const hours = Math.floor(endMinutes / 60);
  const minutes = endMinutes % 60;
  const utcTime = Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcTime);
};

const hasBookingEndTimePassed = (booking: IBooking): boolean => {
  if (booking.slotReleaseAt && new Date() >= new Date(booking.slotReleaseAt)) return true;
  const lastEndMinutes = booking.preferredTime
    .map((slot) => {
      const [hours, minutes] = slot.endTime.split(":").map(Number);
      return hours * 60 + minutes;
    })
    .reduce((max, current) => (current > max ? current : max), 0);
  return new Date() >= getSlotEndDateInIST(new Date(booking.preferredDate), lastEndMinutes);
};

declare const process: {
  env: {
    STRIPE_SECRET_KEY: string;
    [key: string]: string | undefined;
  };
};

@injectable()
export class UserService implements IUserService {
  private _stripe: Stripe;

  constructor(
    @inject(TYPES.IUserRepository) private _userRepository: IUserRepository,
    @inject(TYPES.IProRepository) private _proRepository: IProRepository,
    @inject(TYPES.IBookingRepository) private _bookingRepository: IBookingRepository,
    @inject(TYPES.IQuotaRepository) private _quotaRepository: IQuotaRepository,
    @inject(TYPES.IWalletRepository) private _walletRepository: IWalletRepository,
    @inject(TYPES.IAdminRepository) private _adminRepository: IAdminRepository,
    @inject(TYPES.INotificationService) private _notificationService: INotificationService,
    @inject(TYPES.ITransactionRepository) private _transactionRepository: ITransactionRepository,
  ) {
    this._stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-06-30.basil",
    });
  }

  async getBookingById(bookingId: string): Promise<BookingCompleteResponse | null> {
    const booking = await this._bookingRepository.findBookingByIdComplete(bookingId);
    return booking ? toBookingCompleteResponse(booking) : null;
  }

  async getQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null> {
    const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
    return quota ? toQuotaResponse(quota) : null;
  }

  async getUserProfile(userId: string): Promise<UserResponse | null> {
    const user = await this._userRepository.findUserById(userId);
    if (!user) return null;
    return toUserProfileResponse(user);
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


    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_GENERAL,
        title: MESSAGES.NOTIFICATION_TITLE_PROFILE_UPDATED,
        description: MESSAGES.NOTIFICATION_DESC_PROFILE_UPDATED,
        userId: userId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_USER_PROFILE_UPDATE_NOTIFICATION, { userId, error });
    }

    return toUserProfileResponse(updatedUser);
  }

  async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<UserResponse | null> {
    const user = await this._userRepository.findUserById(userId);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.INCORRECT_PASSWORD);
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);

    const updateData: Partial<IUser> = {
      password: hashedNewPassword,
    };

    const updatedUser = await this._userRepository.updateUser(userId, updateData);
    if (!updatedUser) return null;


    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_GENERAL,
        title: MESSAGES.NOTIFICATION_TITLE_PASSWORD_CHANGED,
        description: MESSAGES.NOTIFICATION_DESC_PASSWORD_CHANGED,
        userId: userId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_USER_PASSWORD_CHANGE_NOTIFICATION, { userId, error });
    }

    return toUserProfileResponse(updatedUser);
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
    const { pros, total, hasMore } = await this._proRepository.findNearbyPros(categoryId, longitude, latitude, skip, limit, sortBy, availabilityFilter);
    return { pros: pros.map(toNearbyProResponse), total, hasMore };
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
    if (!user) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
    if (user.isBanned) throw new HttpError(HttpStatus.FORBIDDEN, MESSAGES.ACCOUNT_BANNED);

    const pro = await this._proRepository.findApprovedProById(proId);
    if (!pro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
    if (pro.isBanned) throw new HttpError(HttpStatus.FORBIDDEN, MESSAGES.ACCOUNT_BANNED);
    if (pro.isUnavailable) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.PRO_CURRENTLY_UNAVAILABLE);

    const preferredDate = new Date(bookingData.preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (preferredDate < today) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.PREFERRED_DATE_IN_PAST);
    }

    const existingBookings = await this._bookingRepository.findBookingsByUserProDateTime(
      userId,
      proId,
      preferredDate,
      bookingData.preferredTime,
      "pending"
    );

    if (existingBookings.length > 0) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.BOOKING_ALREADY_IN_PROGRESS);
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
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.TIME_SLOT_NOT_AVAILABLE);
      }
      if (availableSlots.find(
        (slot) =>
          slot.startTime === selectedSlot.startTime &&
          slot.endTime === selectedSlot.endTime &&
          slot.booked
      )) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.TIME_SLOT_ALREADY_BOOKED);
      }
    }

    const updatedSlots = bookingData.preferredTime.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      booked: true,
    }));

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

    const session = await mongoose.startSession();
    let createdBooking: BookingResponse | null = null;
    try {
      session.startTransaction();
      const availabilityUpdate = await this._proRepository.updateAvailability(pro.id, dayOfWeek, updatedSlots, true, session);
      if (!availabilityUpdate) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.FAILED_UPDATE_PRO_AVAIL_SELECTED_SLOTS);
      }
      createdBooking = toBookingResponse(await this._bookingRepository.createBooking(booking, session));
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    if (!createdBooking) {
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.SERVER_ERROR);
    }

    try {
      const toMins = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const lastEndMinutes = bookingData.preferredTime
        .map((s) => toMins(s.endTime))
        .reduce((max, cur) => (cur > max ? cur : max), 0);
      const slotReleaseAt = getSlotEndDateInIST(preferredDate, lastEndMinutes);
      const scheduled = await scheduleSlotRelease(createdBooking.id, slotReleaseAt);
      if (scheduled) {
        await this._bookingRepository.updateBooking(createdBooking.id, {
          slotReleaseJobId: createdBooking.id,
          slotReleaseAt,
        });
      }
    } catch (error) {
      logger.error(MESSAGES.FAILED_SCHEDULE_SLOT_RELEASE, { bookingId: createdBooking.id, error });
    }


    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_BOOKING,
        title: MESSAGES.NOTIFICATION_TITLE_NEW_BOOKING_REQUEST,
        description: `${MESSAGES.NOTIFICATION_DESC_NEW_BOOKING_REQUEST_PREFIX} ${user.name}. ${MESSAGES.NOTIFICATION_DESC_NEW_BOOKING_REQUEST_SUFFIX}`,
        proId: proId,
        bookingId: createdBooking.id
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_BOOKING_CREATION_NOTIFICATION_PRO, { proId, bookingId: createdBooking.id, userName: user.name, error });
    }

    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_BOOKING,
        title: MESSAGES.NOTIFICATION_TITLE_BOOKING_CREATED_SUCCESSFULLY,
        description: `${MESSAGES.NOTIFICATION_DESC_BOOKING_CREATED_PREFIX} ${pro.firstName} ${pro.lastName} ${MESSAGES.NOTIFICATION_DESC_BOOKING_CREATED_SUFFIX}`,
        userId: userId,
        bookingId: createdBooking.id
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_BOOKING_CREATION_NOTIFICATION_USER, { userId, bookingId: createdBooking.id, proName: `${pro.firstName} ${pro.lastName}`, error });
    }

    return createdBooking;
  }

  async fetchBookingDetails(
    userId: string,
    page: number = 1,
    limit: number = 5,
    search?: string,
    status?: string,
    sortBy: "latest" | "oldest" = "latest",
    bookingId?: string
  ): Promise<{ bookings: BookingResponse[]; total: number }> {
    const { bookings, total } = await this._bookingRepository.fetchBookingDetails(
      userId,
      page,
      limit,
      search,
      status,
      sortBy,
      bookingId
    );
    return { bookings: bookings.map(toBookingResponse), total };
  }

  async fetchBookingHistoryDetails(
    userId: string,
    page: number = 1,
    limit: number = 5,
    search?: string,
    status?: string,
    sortBy: "latest" | "oldest" = "latest",
    bookingId?: string
  ): Promise<{ bookings: BookingResponse[]; total: number }> {
    const { bookings, total } = await this._bookingRepository.fetchBookingHistoryDetails(
      userId,
      page,
      limit,
      search,
      status,
      sortBy,
      bookingId
    );
    return { bookings: bookings.map(toBookingResponse), total };
  }

  async createPaymentIntent(bookingId: string, amount: number): Promise<{ clientSecret: string }> {
    const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
    if (!quota) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.QUOTA_NOT_FOUND);
    if (quota.paymentStatus === "completed") {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.BOOKING_PAYMENT_ALREADY_COMPLETED);
    }

    if (quota.paymentIntentId) {
      try {
        const existing = await this._stripe.paymentIntents.retrieve(quota.paymentIntentId);
        if (existing && existing.client_secret) {
          if (existing.status && !["succeeded", "canceled"].includes(existing.status)) {
            logger.info(MESSAGES.LOG_REUSING_EXISTING_STRIPE_PAYMENT_INTENT, {
              bookingId,
              quotaId: quota._id.toString(),
              paymentIntentId: existing.id,
              paymentIntentStatus: existing.status,
            });
            return { clientSecret: existing.client_secret };
          }
        }
      } catch (error) {
        logger.error(MESSAGES.FAILED_REDIS_OPERATION_PAYMENT_INTENT, { bookingId, error });
      }
    }

    const paymentIntent = await this._stripe.paymentIntents.create({
      amount,
      currency: "inr",
      automatic_payment_methods: { enabled: true },
      metadata: { bookingId },
    });
    if (!paymentIntent.client_secret) {
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.FAILED_CREATE_PAYMENT_INTENT);
    }
    await this._quotaRepository.updateQuota(quota._id.toString(), { paymentIntentId: paymentIntent.id });
    logger.info(MESSAGES.LOG_CREATED_NEW_STRIPE_PAYMENT_INTENT, {
      bookingId,
      quotaId: quota._id.toString(),
      paymentIntentId: paymentIntent.id,
      paymentIntentStatus: paymentIntent.status,
      amount,
    });
    return { clientSecret: paymentIntent.client_secret };
  }

  async recordPaymentEvent(paymentIntentId: string): Promise<boolean> {
    try {
      await PaymentEventModel.create({ paymentIntentId });
      return true;
    } catch (error: unknown) {
      const duplicateError = error as { code?: number };
      if (duplicateError.code === 11000) {
        return false;
      }
      throw error;
    }
  }

  async completeBookingPayment(bookingId: string): Promise<void> {
    const redis = new RedisConnector();
    let lockKey: string | null = null;
    let locked = false;
    let paymentCompletion: {
      bookingUserId: string;
      bookingProId: string;
      quotaId: string;
      totalCost: number;
      walletId: string;
      proAmount: number;
      adminRevenue: number;
    } | null = null;
    try {
      if (redis.isConnected()) {
        const client = redis.getClient();
        lockKey = `lock:booking:${bookingId}:payment`;
        const ok = await client.set(lockKey, "1", { NX: true, PX: 5 * 60 * 1000 });
        if (!ok) {
          logger.warn(MESSAGES.LOG_PAYMENT_COMPLETION_LOCK_EXISTS, { bookingId, lockKey });
          return;
        }
        locked = true;
      }
    } catch (error) {
      logger.error(MESSAGES.FAILED_REDIS_OPERATION_PAYMENT_LOCK, { bookingId, error });
    }

    try {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const booking = await this._bookingRepository.findBookingById(bookingId, session);
      if (!booking) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.BOOKING_NOT_FOUND);

      const quotaExisting = await this._quotaRepository.findQuotaByBookingId(bookingId, session);
      if (!quotaExisting) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.QUOTA_NOT_FOUND);

      logger.info(MESSAGES.LOG_COMPLETING_BOOKING_PAYMENT, {
        bookingId,
        bookingStatusBefore: booking.status,
        quotaId: quotaExisting._id.toString(),
        quotaPaymentStatusBefore: quotaExisting.paymentStatus,
        paymentIntentId: quotaExisting.paymentIntentId,
      });

      const quota = await this._quotaRepository.markPaymentCompletedIfPending(quotaExisting._id.toString(), session);
      if (!quota) {
        logger.warn(MESSAGES.LOG_QUOTA_PAYMENT_ALREADY_UPDATED, {
          bookingId,
          quotaId: quotaExisting._id.toString(),
        });
        await session.commitTransaction();
        return;
      }
      const proAmount = Math.round(quota.totalCost * 0.7);
      let wallet = await this._walletRepository.findWalletByProId(booking.proId.toString(), false, session);
      if (!wallet) {
        wallet = await this._walletRepository.createWallet({
          proId: booking.proId,
          balance: 0,
        }, session);
      }

      const updatedWallet = await this._walletRepository.updateWallet(wallet._id.toString(), {
        balance: wallet.balance + proAmount,
      } as Partial<WalletDocument>, session);

      if (!updatedWallet) {
        throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.FAILED_UPDATE_PRO_WALLET);
      }
      const existingProTx = await this._transactionRepository.findOneByKeys({
        bookingId: booking.id,
        type: "credit",
        proId: booking.proId.toString(),
        amount: proAmount,
      }, session);
      if (!existingProTx) {
        try {
          await this._transactionRepository.createTransaction({
            proId: new mongoose.Types.ObjectId(booking.proId),
            walletId: new mongoose.Types.ObjectId(updatedWallet._id),
            amount: proAmount,
            type: "credit",
            date: new Date(),
            quotaId: new mongoose.Types.ObjectId(quota._id),
            bookingId: new mongoose.Types.ObjectId(booking.id),
            description: `${MESSAGES.TRANSACTION_DESC_PAYMENT_FOR_BOOKING_PREFIX}${booking.id.slice(-6)}`,
          }, session);
        } catch (error) {
          logger.error(MESSAGES.FAILED_CREATE_PRO_REVENUE_TRANSACTION, { proId: booking.proId, amount: proAmount, bookingId: booking.id, error });
          throw error;
        }
      }

      const adminRevenue = Math.round(quota.totalCost * 0.3);
      const bookingStatusUpdate = hasBookingEndTimePassed(booking) ? { status: "completed" as const } : {};

      await this._bookingRepository.updateBooking(booking.id, {
        ...bookingStatusUpdate,
        adminRevenue: adminRevenue,
        proRevenue: proAmount
      }, session);

      try {
        const admin = await this._adminRepository.find(session);
        if (admin) {
          const existingAdminTx = await this._transactionRepository.findOneByKeys({
            bookingId: booking.id,
            type: "credit",
            proId: booking.proId.toString(),
            amount: adminRevenue,
            adminId: admin.id,
          }, session);
          if (!existingAdminTx) {
            try {
              await this._transactionRepository.createTransaction({
                proId: new mongoose.Types.ObjectId(booking.proId),
                walletId: new mongoose.Types.ObjectId(updatedWallet._id),
                amount: adminRevenue,
                type: "credit",
                date: new Date(),
                quotaId: new mongoose.Types.ObjectId(quota._id),
                bookingId: new mongoose.Types.ObjectId(booking.id),
                adminId: new mongoose.Types.ObjectId(admin.id),
                description: `${MESSAGES.TRANSACTION_DESC_ADMIN_REVENUE_FOR_BOOKING_PREFIX}${booking.id.slice(-6)}`,
              }, session);
            } catch (error) {
              logger.error(MESSAGES.FAILED_CREATE_ADMIN_REVENUE_TRANSACTION, { adminId: admin._id, amount: adminRevenue, bookingId: booking.id, error });
              throw error;
            }
          }
        }
      } catch (error) {
        logger.error(MESSAGES.FAILED_CREATE_ADMIN_REVENUE_TRANSACTION, { bookingId: booking.id, error });
        throw error;
      }

      paymentCompletion = {
        bookingUserId: booking.userId.toString(),
        bookingProId: booking.proId.toString(),
        quotaId: quota._id.toString(),
        totalCost: quota.totalCost,
        walletId: wallet._id.toString(),
        proAmount,
        adminRevenue,
      };

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    if (!paymentCompletion) {
      return;
    }

    logger.info(MESSAGES.LOG_BOOKING_PAYMENT_COMPLETED_SUCCESSFULLY, {
      bookingId,
      quotaId: paymentCompletion.quotaId,
      totalCost: paymentCompletion.totalCost,
      proAmount: paymentCompletion.proAmount,
      adminRevenue: paymentCompletion.adminRevenue,
    });

    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_WALLET,
        title: MESSAGES.NOTIFICATION_TITLE_PAYMENT_SUCCESSFUL,
        description: `${MESSAGES.NOTIFICATION_DESC_PAYMENT_SUCCESS_PREFIX} ${MESSAGES.CURRENCY_INR}${paymentCompletion.totalCost} ${MESSAGES.NOTIFICATION_DESC_PAYMENT_SUCCESS_SUFFIX}`,
        userId: paymentCompletion.bookingUserId,
        quotaId: paymentCompletion.quotaId,
        bookingId: bookingId
      });

      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_WALLET,
        title: MESSAGES.NOTIFICATION_TITLE_PAYMENT_RECEIVED,
        description: `${MESSAGES.NOTIFICATION_DESC_PAYMENT_RECEIVED_PREFIX} ${MESSAGES.CURRENCY_INR}${paymentCompletion.proAmount} ${MESSAGES.NOTIFICATION_DESC_PAYMENT_RECEIVED_SUFFIX}`,
        proId: paymentCompletion.bookingProId,
        walletId: paymentCompletion.walletId,
        quotaId: paymentCompletion.quotaId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_PAYMENT_COMPLETION_NOTIFICATION, { proId: paymentCompletion.bookingProId, amount: paymentCompletion.proAmount, walletId: paymentCompletion.walletId, quotaId: paymentCompletion.quotaId, error });
    }
    } finally {
      try {
      if (locked && lockKey && redis.isConnected()) {
        await redis.getClient().del(lockKey);
      }
      } catch (error) {
        logger.error(MESSAGES.FAILED_REDIS_CLEANUP_PAYMENT_LOCK, { lockKey, error });
      }
    }
  }

  async cancelBooking(userId: string, bookingId: string, cancelReason: string): Promise<{ message: string }> {
    const booking = await this._bookingRepository.findBookingById(bookingId);
    if (!booking) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.BOOKING_NOT_FOUND);
    if (booking.userId.toString() !== userId) throw new HttpError(HttpStatus.FORBIDDEN, MESSAGES.UNAUTHORIZED_CANCEL_BOOKING);
    if (booking.status !== "pending") throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ONLY_PENDING_CAN_BE_CANCELLED);

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
      status: "cancelled",
      cancelReason: cancelReason,
      preferredTime: updatedSlots.map((slot) => ({ ...slot })),
    });

    try { await cancelSlotRelease(bookingId); } catch (error) {
      logger.error(MESSAGES.FAILED_CANCEL_SLOT_RELEASE_USER, { bookingId, error });
    }
    await this._bookingRepository.updateBooking(bookingId, { slotReleaseJobId: null, slotReleaseAt: null });


    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_BOOKING,
        title: MESSAGES.NOTIFICATION_TITLE_BOOKING_CANCELLED_SUCCESSFULLY,
        description: MESSAGES.NOTIFICATION_DESC_BOOKING_CANCELLED_USER,
        userId: userId,
        bookingId: bookingId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_BOOKING_CANCELLATION_NOTIFICATION_USER, { userId, bookingId, error });
    }

    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_BOOKING,
        title: MESSAGES.NOTIFICATION_TITLE_BOOKING_CANCELLED,
        description: MESSAGES.NOTIFICATION_DESC_BOOKING_CANCELLED_PRO,
        proId: booking.proId.toString(),
        bookingId: bookingId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_BOOKING_CANCELLATION_NOTIFICATION_PRO, { proId: booking.proId.toString(), bookingId, error });
    }

    return { message: MESSAGES.BOOKING_CANCELLED_SUCCESSFULLY };
  }

  async handlePaymentFailure(bookingId: string): Promise<void> {
    const booking = await this._bookingRepository.findBookingById(bookingId);
    if (!booking) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.BOOKING_NOT_FOUND);

    const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
    if (quota) {
      await this._quotaRepository.updateQuota(quota._id.toString(), { paymentStatus: "failed" });
      logger.warn(MESSAGES.LOG_PAYMENT_MARKED_AS_FAILED, {
        bookingId,
        quotaId: quota._id.toString(),
        previousBookingStatus: booking.status,
      });
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata?.bookingId) {
          const bookingId = paymentIntent.metadata.bookingId;
          logger.info(MESSAGES.LOG_HANDLING_PAYMENT_INTENT_SUCCEEDED, {
            eventId: event.id,
            bookingId,
            paymentIntentId: paymentIntent.id,
            stripeStatus: paymentIntent.status,
          });
          const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
          if (!quota) {
            logger.warn(MESSAGES.LOG_WEBHOOK_PAYMENT_SUCCEEDED_QUOTA_NOT_FOUND, {
              eventId: event.id,
              bookingId,
              paymentIntentId: paymentIntent.id,
            });
            return;
          }
          if (quota.paymentIntentId && quota.paymentIntentId !== paymentIntent.id) {
            logger.warn(MESSAGES.LOG_WEBHOOK_PAYMENT_SUCCEEDED_INTENT_MISMATCH, {
              eventId: event.id,
              bookingId,
              expectedPaymentIntentId: quota.paymentIntentId,
              receivedPaymentIntentId: paymentIntent.id,
            });
            return;
          }
          await this.completeBookingPayment(bookingId);
        } else {
          logger.warn(MESSAGES.LOG_WEBHOOK_PAYMENT_SUCCEEDED_MISSING_BOOKING_ID, {
            eventId: event.id,
            paymentIntentId: paymentIntent.id,
          });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        if (failedPaymentIntent.metadata?.bookingId) {
          logger.warn(MESSAGES.LOG_HANDLING_PAYMENT_INTENT_FAILED, {
            eventId: event.id,
            bookingId: failedPaymentIntent.metadata.bookingId,
            paymentIntentId: failedPaymentIntent.id,
            stripeStatus: failedPaymentIntent.status,
          });
          await this.handlePaymentFailure(failedPaymentIntent.metadata.bookingId);
        } else {
          logger.warn(MESSAGES.LOG_WEBHOOK_PAYMENT_FAILED_MISSING_BOOKING_ID, {
            eventId: event.id,
            paymentIntentId: failedPaymentIntent.id,
          });
        }
        break;
      }
      default:
        logger.info(MESSAGES.LOG_STRIPE_WEBHOOK_EVENT_IGNORED, {
          eventId: event.id,
          eventType: event.type,
        });
    }
  }
}
