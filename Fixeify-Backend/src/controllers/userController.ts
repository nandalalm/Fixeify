import { Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserService } from "../services/IUserService";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import { AuthRequest } from "../middleware/authMiddleware";
import Stripe from "stripe";
import { HttpStatus } from "../enums/httpStatus";
import PaymentEventModel from "../models/paymentEventModel";

declare const process: {
  env: {
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET?: string;
    [key: string]: string | undefined;
  };
};

declare const console: {
  error: (message: string) => void;
};

@injectable()
export class UserController {
  private _stripe: Stripe;

  constructor(@inject(TYPES.IUserService) private _userService: IUserService) {
    this._stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-06-30.basil",
    });
  }

  async getUserProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await this._userService.getUserProfile(userId);
      if (!user) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      res.status(HttpStatus.OK).json(user);
    } catch (error) {
      next(error);
    }
  }

  async updateUserProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { name, email, phoneNo, address, photo } = req.body;
      const updatedUser = await this._userService.updateUserProfile(userId, { name, email, phoneNo, address, photo });
      if (!updatedUser) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      res.status(HttpStatus.OK).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword } = req.body;
      const updatedUser = await this._userService.changePassword(userId, { currentPassword, newPassword });
      if (!updatedUser) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      res.status(HttpStatus.OK).json({ message: MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY });
    } catch (error) {
      next(error);
    }
  }

  async getNearbyPros(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId, longitude, latitude, page = '1', limit = '5', sortBy = 'nearest', availabilityFilter } = req.query;
      if (!categoryId || !longitude || !latitude) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.CATEGORY_LONG_LAT_REQUIRED);
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const result = await this._userService.getNearbyPros(
        categoryId as string,
        parseFloat(longitude as string),
        parseFloat(latitude as string),
        skip,
        limitNum,
        sortBy as string,
        availabilityFilter as string
      );

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) throw new HttpError(HttpStatus.UNAUTHORIZED, MESSAGES.UNAUTHORIZED);
      const { proId, categoryId, issueDescription, location, phoneNumber, preferredDate, preferredTime } = req.body;
      if (!proId || !categoryId || !issueDescription || !location || !phoneNumber || !preferredDate || !preferredTime) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
      }

      const bookingResponse = await this._userService.createBooking(userId, proId, {
        categoryId,
        issueDescription,
        location,
        phoneNumber,
        preferredDate: new Date(preferredDate),
        preferredTime,
      });
      res.status(HttpStatus.CREATED).json(bookingResponse);
    } catch (error) {
      next(error);
    }
  }

  async fetchBookingDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const search = (req.query.search as string) || undefined;
      const status = (req.query.status as string) || undefined; // e.g., "pending,accepted" | "pending" | "accepted"
      const sortBy = ((req.query.sortBy as string) as "latest" | "oldest") || "latest";
      const bookingId = (req.query.bookingId as string) || undefined;
      const { bookings, total } = await this._userService.fetchBookingDetails(
        userId,
        page,
        limit,
        search,
        status,
        sortBy,
        bookingId
      );
      res.status(HttpStatus.OK).json({ bookings, total });
    } catch (error) {
      next(error);
    }
  }

  async fetchBookingHistoryDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const search = (req.query.search as string) || undefined;
      const status = (req.query.status as string) || undefined;
      const sortBy = ((req.query.sortBy as string) as "latest" | "oldest") || "latest";
      const bookingId = (req.query.bookingId as string) || undefined;
      const { bookings, total } = await this._userService.fetchBookingHistoryDetails(
        userId,
        page,
        limit,
        search,
        status,
        sortBy,
        bookingId
      );
      res.status(HttpStatus.OK).json({ bookings, total });
    } catch (error) {
      next(error);
    }
  }

  async createPaymentIntent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId, amount } = req.body;
      if (!bookingId || !amount) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.BOOKINGID_AMOUNT_REQUIRED);

      const paymentIntent = await this._userService.createPaymentIntent(bookingId, amount);
      res.status(HttpStatus.OK).json(paymentIntent);
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { bookingId, cancelReason } = req.body;
      if (!bookingId || !cancelReason) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.BOOKINGID_CANCELREASON_REQUIRED);

      const result = await this._userService.cancelBooking(userId, bookingId, cancelReason);
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId } = req.params;
      const booking = await this._userService.getBookingById(bookingId);
      if (!booking) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.BOOKING_NOT_FOUND);
      res.status(HttpStatus.OK).json(booking);
    } catch (error) {
      next(error);
    }
  }

  async getQuotaByBookingId(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId } = req.params;
      const quota = await this._userService.getQuotaByBookingId(bookingId);
      if (!quota) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.QUOTA_NOT_FOUND);
      res.status(HttpStatus.OK).json(quota);
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED);

      let event;
      try {
        const rawBody = req.body;
        if (!rawBody || !(rawBody instanceof Buffer)) {
          throw new Error(MESSAGES.RAW_BODY_NOT_AVAILABLE_OR_INVALID);
        }
        event = this._stripe.webhooks.constructEvent(rawBody.toString(), sig, endpointSecret);
      } catch (err: unknown) {
        const error = err as Error;
        console.error(`${MESSAGES.WEBHOOK_SIGNATURE_VERIFICATION_FAILED}: ${error.message}`);
        throw new HttpError(HttpStatus.BAD_REQUEST, `${MESSAGES.WEBHOOK_SIGNATURE_VERIFICATION_FAILED}: ${error.message}`);
      }

      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const pid = paymentIntent.id;
        // Extract booking ID from payment intent metadata
        try {
          await PaymentEventModel.create({ paymentIntentId: pid });
        } catch (e: unknown) {
          const error = e as { code?: number };
          if (error && error.code === 11000) {
            res.status(HttpStatus.OK).json({ received: true, duplicate: true });
            return;
          }
          throw e;
        }
      }

      await this._userService.handleWebhookEvent(event);
      res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      next(error);
    }
  }
}