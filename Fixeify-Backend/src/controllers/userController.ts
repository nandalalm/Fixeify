import { Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserService } from "../services/IUserService";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import { AuthRequest } from "../middleware/authMiddleware";

@injectable()
export class UserController {
  constructor(@inject(TYPES.IUserService) private _userService: IUserService) {}

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
      const bookings = await this._userService.fetchBookingDetails(userId);
      res.status(200).json(bookings);
    } catch (error) {
      next(error);
    }
  }
}