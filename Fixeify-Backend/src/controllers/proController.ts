import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IProService } from "../services/IProService";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";
import { ProResponse } from "../dtos/response/proDtos";
import { HttpStatus } from "../enums/httpStatus";

@injectable()
export class ProController {
  constructor(@inject(TYPES.IProService) private _proService: IProService) { }

  async applyPro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proData = req.body;
      const result = await this._proService.applyPro(proData);
      res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.id;
      const profile = await this._proService.getProfile(proId);
      res.status(HttpStatus.OK).json(profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.id;
      const profileData = req.body;
      const updatedProfile = await this._proService.updateProfile(proId, profileData);
      res.status(HttpStatus.OK).json(updatedProfile);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.id;
      const { currentPassword, newPassword } = req.body;
      const user = await this._proService.changePassword(proId, { currentPassword, newPassword });
      if (!user) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
      res.status(HttpStatus.OK).json({ message: MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY });
    } catch (error) {
      next(error);
    }
  }

  async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.id;
      const availability = await this._proService.getAvailability(proId);
      res.status(HttpStatus.OK).json(availability);
    } catch (error) {
      next(error);
    }
  }

  async updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.id;
      const { availability, isUnavailable } = req.body as { availability: ProResponse['availability']; isUnavailable: boolean };

      if (isUnavailable) {
        const hasBookedSlots = Object.values(availability).some(
          (slots: any[] | undefined) => slots?.some((slot: any) => slot.booked)
        );
        if (hasBookedSlots) {
          throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.CANNOT_MARK_UNAVAILABLE_WITH_BOOKED_SLOTS);
        }
      }

      const updatedAvailability = await this._proService.updateAvailability(proId, { availability, isUnavailable });
      res.status(HttpStatus.OK).json(updatedAvailability);
    } catch (error) {
      next(error);
    }
  }

  async getAllCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await this._proService.getAllCategories();
      res.status(HttpStatus.OK).json(categories);
    } catch (error) {
      next(error);
    }
  }

  async fetchProBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const status = req.query.status as string; // New status filter
      const sortBy = (req.query.sortBy as "latest" | "oldest") || undefined;
      const { bookings, total } = await this._proService.fetchProBookings(proId, page, limit, status, sortBy);
      res.status(HttpStatus.OK).json({ bookings, total });
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await this._proService.getBookingById(req.params.id);
      res.status(HttpStatus.OK).json(booking);
    } catch (err) {
      next(err);
    }
  }

  async acceptBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const result = await this._proService.acceptBooking(bookingId);
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async rejectBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const { rejectedReason } = req.body;
      if (!rejectedReason) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.REJECTION_REASON_REQUIRED);
      const result = await this._proService.rejectBooking(bookingId, rejectedReason);
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async generateQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const { laborCost, materialCost, additionalCharges } = req.body;
      const quota = await this._proService.generateQuota(bookingId, { laborCost, materialCost, additionalCharges });
      res.status(HttpStatus.CREATED).json(quota);
    } catch (error) {
      next(error);
    }
  }

  async fetchQuotaByBookingId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const quota = await this._proService.fetchQuotaByBookingId(bookingId);
      res.status(HttpStatus.OK).json(quota);
    } catch (error) {
      next(error);
    }
  }

  async getWallet(req: Request, res: Response) {
    try {
      const { proId } = req.params;
      const wallet = await this._proService.getWallet(proId);
      if (!wallet) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.WALLET_NOT_FOUND);
      res.status(HttpStatus.OK).json(wallet);
    } catch (error: any) {
      res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  async getWalletWithPagenation(req: Request, res: Response) {
    try {
      const { proId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const { wallet, total } = await this._proService.getWalletWithPagination(proId, page, limit);
      if (!wallet) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.WALLET_NOT_FOUND);
      res.status(HttpStatus.OK).json({ wallet, total });
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message });
    }
  }

  async requestWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.proId;
      const { amount, paymentMode, bankName, accountNumber, ifscCode, branchName, upiCode, bookingId } = req.body;
      if (!amount || amount < 200) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.MIN_WITHDRAWAL_AMOUNT);
      const wallet = await this._proService.getWallet(proId);
      if (!wallet) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.WALLET_NOT_FOUND);
      if (amount > wallet.balance) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.WITHDRAWAL_EXCEEDS_BALANCE);
      if (paymentMode === "bank") {
        if (!bankName || !accountNumber || !ifscCode || !branchName) {
          throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_BANK_DETAILS_REQUIRED);
        }
      } else if (paymentMode === "upi") {
        if (!upiCode) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.UPI_CODE_REQUIRED);
        const vpa = (upiCode as string).trim();
        const upiPattern = /^(?![._-])(?!.*[._-]{2})[A-Za-z0-9._-]{2,256}(?<![._-])@[A-Za-z][A-Za-z0-9]{1,63}$/;
        if (vpa.length < 7 || !upiPattern.test(vpa)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.UPI_ID_INVALID);
      }
      const withdrawalRequest = await this._proService.requestWithdrawal(proId, { amount, paymentMode, bankName, accountNumber, ifscCode, branchName, upiCode, bookingId });
      res.status(HttpStatus.CREATED).json(withdrawalRequest);
    } catch (error) {
      next(error);
    }
  }

  async getPendingProById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pendingProId = req.params.id;
      const pendingPro = await this._proService.getPendingProById(pendingProId);
      res.status(HttpStatus.OK).json(pendingPro);
    } catch (error) {
      next(error);
    }
  }

  async getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.proId;
      if (!proId) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.PRO_ID_REQUIRED);
      }
      const metrics = await this._proService.getDashboardMetrics(proId);
      res.status(HttpStatus.OK).json(metrics);
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyRevenueSeries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.proId;
      if (!proId) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.PRO_ID_REQUIRED);
      }
      const lastNMonths = req.query.lastNMonths ? parseInt(req.query.lastNMonths as string, 10) : undefined;
      const series = await this._proService.getMonthlyRevenueSeries(proId, lastNMonths);
      res.status(HttpStatus.OK).json(series);
    } catch (error) {
      next(error);
    }
  }

  async getWithdrawalRequestsByProId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { proId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const sortBy = (req.query.sortBy as "latest" | "oldest") || undefined;
      const status = (req.query.status as "pending" | "approved" | "rejected") || undefined;
      const { withdrawals, total } = await this._proService.getWithdrawalRequestsByProIdPaginated(proId, page, limit, sortBy, status);
      res.status(HttpStatus.OK).json({ withdrawals, total });
    } catch (error) {
      next(error);
    }
  }
}