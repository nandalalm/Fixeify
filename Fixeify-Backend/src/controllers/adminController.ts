import { injectable, inject } from "inversify";
import { Request, Response, NextFunction } from "express";
import { TYPES } from "../types";
import { IAdminService } from "../services/IAdminService";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";
import { UserResponse } from "../dtos/response/userDtos";
import { ProResponse } from "../dtos/response/proDtos";
import { CategoryResponse } from "../dtos/response/categoryDtos";
import { HttpStatus } from "../enums/httpStatus";

@injectable()
export class AdminController {
  constructor(@inject(TYPES.IAdminService) private _adminService: IAdminService) { }

  async getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const sortBy = (req.query.sortBy as "latest" | "oldest") || "latest";
      const { bookings, total } = await this._adminService.getBookings(page, limit, search, status, sortBy);
      res.status(HttpStatus.OK).json({ bookings, total });
    } catch (error) {
      next(error);
    }
  }

  async getQuotaByBookingId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId } = req.params;
      const quota = await this._adminService.getQuotaByBookingId(bookingId);
      if (!quota) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.QUOTA_NOT_FOUND);
      res.status(HttpStatus.OK).json(quota);
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, image } = req.body;
      if (!name || !image) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.NAME_AND_EMAIL_REQUIRED);
      }
      const category: CategoryResponse = await this._adminService.createCategory(name, image);
      res.status(HttpStatus.CREATED).json(category);
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const { categories, total } = await this._adminService.getCategories(page, limit);
      res.status(HttpStatus.OK).json({ categories, total });
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
      if (!updatedCategory) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CATEGORY_NOT_FOUND);
      res.status(HttpStatus.OK).json(updatedCategory);
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const sortBy = (req.query.sortBy as "latest" | "oldest") || "latest";
      const { users, total } = await this._adminService.getUsers(page, limit, sortBy);
      res.status(HttpStatus.OK).json({ users, total });
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
      if (!updatedUser) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      res.status(HttpStatus.OK).json(updatedUser);
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
      if (!updatedPro) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
      res.status(HttpStatus.OK).json(updatedPro);
    } catch (error) {
      next(error);
    }
  }

  async getPendingPros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const sortBy = (req.query.sortBy as "latest" | "oldest") || "latest";
      const { pros, total } = await this._adminService.getPendingPros(page, limit, sortBy);
      res.status(HttpStatus.OK).json({ pros, total });
    } catch (error) {
      next(error);
    }
  }

  async getPendingProById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pro = await this._adminService.getPendingProById(id);
      res.status(HttpStatus.OK).json(pro);
    } catch (error) {
      next(error);
    }
  }

  async approvePro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { about } = req.body;
      await this._adminService.approvePro(id, about || null);
      res.status(HttpStatus.OK).json({ message: MESSAGES.PRO_APPROVED_SUCCESSFULLY });
    } catch (error) {
      next(error);
    }
  }

  async rejectPro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.REJECTION_REASON_REQUIRED);
      await this._adminService.rejectPro(id, reason);
      res.status(HttpStatus.OK).json({ message: MESSAGES.PRO_REJECTED_SUCCESSFULLY });
    } catch (error) {
      next(error);
    }
  }

  async getTrendingService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trendingService = await this._adminService.getTrendingService();
      if (!trendingService) {
        throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.NO_TRENDING_SERVICE_FOUND);
      }
      res.status(HttpStatus.OK).json(trendingService);
    } catch (error) {
      next(error);
    }
  }

  async getAdminTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { adminId } = req.query;
      const page = parseInt((req.query.page as string) || "1", 10);
      const limit = parseInt((req.query.limit as string) || "5", 10);
      if (!adminId || typeof adminId !== "string") {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ADMIN_ID_REQUIRED);
      }
      const result = await this._adminService.getAdminTransactions(adminId, page, limit);
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { adminId } = req.query;
      if (!adminId || typeof adminId !== "string") {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ADMIN_ID_REQUIRED);
      }
      const metrics = await this._adminService.getDashboardMetrics(adminId);
      res.status(HttpStatus.OK).json(metrics);
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyRevenueSeries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lastNMonths = req.query.lastNMonths ? parseInt(req.query.lastNMonths as string, 10) : undefined;
      const series = await this._adminService.getMonthlyRevenueSeries(lastNMonths);
      res.status(HttpStatus.OK).json(series);
    } catch (error) {
      next(error);
    }
  }

  async getPlatformProMonthlyRevenueSeries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lastNMonths = req.query.lastNMonths ? parseInt(req.query.lastNMonths as string, 10) : undefined;
      const series = await this._adminService.getPlatformProMonthlyRevenueSeries(lastNMonths);
      res.status(HttpStatus.OK).json(series);
    } catch (error) {
      next(error);
    }
  }

  async getApprovedPros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const sortBy = (req.query.sortBy as "latest" | "oldest") || "latest";
      const { pros, total } = await this._adminService.getApprovedPros(page, limit, sortBy);
      res.status(HttpStatus.OK).json({ pros, total });
    } catch (error) {
      next(error);
    }
  }

  async getApprovedProById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pro = await this._adminService.getApprovedProById(id);
      res.status(HttpStatus.OK).json(pro);
    } catch (error) {
      next(error);
    }
  }

  async getWithdrawalRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const sortBy = (req.query.sortBy as "latest" | "oldest") || "latest";
      const status = req.query.status as "pending" | "approved" | "rejected" | undefined;
      const { withdrawals, total, pros } = await this._adminService.getWithdrawalRequests(page, limit, sortBy, status);
      res.status(HttpStatus.OK).json({ withdrawals, total, pros });
    } catch (error) {
      next(error);
    }
  }

  async acceptWithdrawalRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { withdrawalId } = req.params;
      await this._adminService.acceptWithdrawalRequest(withdrawalId);
      res.status(HttpStatus.OK).json({ message: MESSAGES.WITHDRAWAL_REQUEST_APPROVED });
    } catch (error) {
      next(error);
    }
  }

  async rejectWithdrawalRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { withdrawalId } = req.params;
      const { reason } = req.body;
      if (!reason) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.REJECTION_REASON_REQUIRED);
      await this._adminService.rejectWithdrawalRequest(withdrawalId, reason);
      res.status(HttpStatus.OK).json({ message: MESSAGES.WITHDRAWAL_REQUEST_REJECTED });
    } catch (error) {
      next(error);
    }
  }
}