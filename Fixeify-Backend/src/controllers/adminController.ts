import { injectable, inject } from "inversify";
import { Request, Response, NextFunction } from "express";
import { TYPES } from "../types";
import { IAdminService } from "../services/IAdminService";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";
import { UserResponse } from "../dtos/response/userDtos";
import { ProResponse } from "../dtos/response/proDtos";
import { CategoryResponse } from "../dtos/response/categoryDtos";
import { BookingResponse } from "../dtos/response/bookingDtos";
import { QuotaResponse } from "../dtos/response/quotaDtos";
import { WithdrawalRequestResponse } from "../dtos/response/withdrawalDtos";

@injectable()
export class AdminController {
  constructor(@inject(TYPES.IAdminService) private _adminService: IAdminService) {}

  async getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const { bookings, total } = await this._adminService.getBookings(page, limit);
      res.status(200).json({ bookings, total });
    } catch (error) {
      next(error);
    }
  }

  async getQuotaByBookingId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId } = req.params;
      const quota = await this._adminService.getQuotaByBookingId(bookingId);
      if (!quota) throw new HttpError(404, MESSAGES.QUOTA_NOT_FOUND);
      res.status(200).json(quota);
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, image } = req.body;
      if (!name || !image) {
        throw new HttpError(400, MESSAGES.NAME_AND_EMAIL_REQUIRED);
      }
      const category: CategoryResponse = await this._adminService.createCategory(name, image);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const { categories, total } = await this._adminService.getCategories(page, limit);
      res.status(200).json({ categories, total });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId } = req.params;
      const { name, image } = req.body;
      const data: { name?: string; image?: string } = {};
      if (name) data.name = name;
      if (image) data.image = image;

      const updatedCategory = await this._adminService.updateCategory(categoryId, data);
      if (!updatedCategory) throw new HttpError(404, MESSAGES.CATEGORY_NOT_FOUND);
      res.status(200).json(updatedCategory);
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const { users, total } = await this._adminService.getUsers(page, limit);
      res.status(200).json({ users, total });
    } catch (error) {
      next(error);
    }
  }

  async banUser(
    req: Request<{ userId: string }, UserResponse | { message: string }, { isBanned: boolean }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { isBanned } = req.body;
      const updatedUser = await this._adminService.banUser(userId, isBanned);
      if (!updatedUser) throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  async banPro(
    req: Request<{ proId: string }, ProResponse | { message: string }, { isBanned: boolean }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { proId } = req.params;
      const { isBanned } = req.body;
      const updatedPro = await this._adminService.banPro(proId, isBanned);
      if (!updatedPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
      res.status(200).json(updatedPro);
    } catch (error) {
      next(error);
    }
  }

  async getPendingPros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const { pros, total } = await this._adminService.getPendingPros(page, limit);
      res.status(200).json({ pros, total });
    } catch (error) {
      next(error);
    }
  }

  async getPendingProById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pro = await this._adminService.getPendingProById(id);
      res.status(200).json(pro);
    } catch (error) {
      next(error);
    }
  }

  async approvePro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { about } = req.body;
      await this._adminService.approvePro(id, about || null);
      res.status(200).json({ message: MESSAGES.PRO_APPROVED_SUCCESSFULLY });
    } catch (error) {
      next(error);
    }
  }

  async rejectPro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) throw new HttpError(400, MESSAGES.REJECTION_REASON_REQUIRED);
      await this._adminService.rejectPro(id, reason);
      res.status(200).json({ message: MESSAGES.PRO_REJECTED_SUCCESSFULLY });
    } catch (error) {
      next(error);
    }
  }

  async getTrendingService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trendingService = await this._adminService.getTrendingService();
      if (!trendingService) {
        throw new HttpError(404, "No trending service found");
      }
      res.status(200).json(trendingService);
    } catch (error) {
      next(error);
    }
  }

  async getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { adminId } = req.query;
      if (!adminId || typeof adminId !== "string") {
        throw new HttpError(400, "Admin ID is required");
      }
      const metrics = await this._adminService.getDashboardMetrics(adminId);
      res.status(200).json(metrics);
    } catch (error) {
      next(error);
    }
  }

  async getApprovedPros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const { pros, total } = await this._adminService.getApprovedPros(page, limit);
      res.status(200).json({ pros, total });
    } catch (error) {
      next(error);
    }
  }

  async getApprovedProById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pro = await this._adminService.getApprovedProById(id);
      res.status(200).json(pro);
    } catch (error) {
      next(error);
    }
  }

  async getWithdrawalRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const { withdrawals, total, pros } = await this._adminService.getWithdrawalRequests(page, limit);
      res.status(200).json({ withdrawals, total, pros });
    } catch (error) {
      next(error);
    }
  }

  async acceptWithdrawalRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { withdrawalId } = req.params;
      await this._adminService.acceptWithdrawalRequest(withdrawalId);
      res.status(200).json({ message: MESSAGES.WITHDRAWAL_REQUEST_APPROVED });
    } catch (error) {
      next(error);
    }
  }

  async rejectWithdrawalRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { withdrawalId } = req.params;
      const { reason } = req.body;
      if (!reason) throw new HttpError(400, MESSAGES.REJECTION_REASON_REQUIRED);
      await this._adminService.rejectWithdrawalRequest(withdrawalId, reason);
      res.status(200).json({ message: MESSAGES.WITHDRAWAL_REQUEST_REJECTED });
    } catch (error) {
      next(error);
    }
  }
}