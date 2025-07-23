import { Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserService } from "../services/IUserService";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import { AuthRequest } from "../middleware/authMiddleware";
import Stripe from "stripe";

type PaymentIntentStatus = Stripe.PaymentIntent.Status;

@injectable()
export class UserController {
  private stripe: Stripe;

  constructor(@inject(TYPES.IUserService) private _userService: IUserService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-06-30.basil",
    });
  }

  async getUserProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await this._userService.getUserProfile(userId);
      if (!user) throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async updateUserProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { name, email, phoneNo, address, photo } = req.body;
      const updatedUser = await this._userService.updateUserProfile(userId, { name, email, phoneNo, address, photo });
      if (!updatedUser) throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword } = req.body;
      const updatedUser = await this._userService.changePassword(userId, { currentPassword, newPassword });
      if (!updatedUser) throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
      res.status(200).json({ message: MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY });
    } catch (error) {
      next(error);
    }
  }

  async getNearbyPros(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId, longitude, latitude } = req.query;
      if (!categoryId || !longitude || !latitude) {
        throw new HttpError(400, "categoryId, longitude, and latitude are required");
      }
      const pros = await this._userService.getNearbyPros(
        categoryId as string,
        parseFloat(longitude as string),
        parseFloat(latitude as string)
      );
      res.status(200).json(pros);
    } catch (error) {
      next(error);
    }
  }

  async createBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) throw new HttpError(401, MESSAGES.UNAUTHORIZED);
      const { proId, categoryId, issueDescription, location, phoneNumber, preferredDate, preferredTime } = req.body;
      if (!proId || !categoryId || !issueDescription || !location || !phoneNumber || !preferredDate || !preferredTime) {
        throw new HttpError(400, "All fields are required");
      }
      const bookingResponse = await this._userService.createBooking(userId, proId, {
        categoryId,
        issueDescription,
        location,
        phoneNumber,
        preferredDate: new Date(preferredDate),
        preferredTime,
      });
      res.status(201).json(bookingResponse);
    } catch (error) {
      next(error);
    }
  }

  async fetchBookingDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const { bookings, total } = await this._userService.fetchBookingDetails(userId, page, limit);
    res.status(200).json({ bookings, total });
  } catch (error) {
    next(error);
  }
}

  async fetchBookingHistoryDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const { bookings, total } = await this._userService.fetchBookingHistoryDetails(userId, page, limit);
      res.status(200).json({ bookings, total });
    } catch (error) {
      next(error);
    }
  }
  
  async createPaymentIntent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId, amount } = req.body;
      if (!bookingId || !amount) throw new HttpError(400, "bookingId and amount are required");

      const paymentIntent = await this._userService.createPaymentIntent(bookingId, amount);
      res.status(200).json(paymentIntent);
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { bookingId, cancelReason } = req.body;
      if (!bookingId || !cancelReason) throw new HttpError(400, "bookingId and cancelReason are required");

      const result = await this._userService.cancelBooking(userId, bookingId, cancelReason);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) throw new HttpError(500, "Stripe webhook secret is not configured");

    let event;
    try {
      const rawBody = req.body; // req.body is a Buffer from express.raw()
      if (!rawBody || !(rawBody instanceof Buffer)) {
        throw new Error("Raw body not available or not a Buffer");
      }
      event = this.stripe.webhooks.constructEvent(rawBody.toString(), sig, endpointSecret);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Webhook signature verification failed: ${error.message}`);
      throw new HttpError(400, `Webhook Error: ${error.message}`);
    }

    await this._userService.handleWebhookEvent(event);
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
}
}