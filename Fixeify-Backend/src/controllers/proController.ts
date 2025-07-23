import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IProService } from "../services/IProService";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";
import { ProResponse } from "../dtos/response/proDtos";

@injectable()
export class ProController {
  constructor(@inject(TYPES.IProService) private _proService: IProService) { }

  async applyPro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proData = req.body;
      const result = await this._proService.applyPro(proData);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.id;
      const profile = await this._proService.getProfile(proId);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.id;
      const profileData = req.body;
      const updatedProfile = await this._proService.updateProfile(proId, profileData);
      res.status(200).json(updatedProfile);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.id;
      const { currentPassword, newPassword } = req.body;
      const user = await this._proService.changePassword(proId, { currentPassword, newPassword });
      if (!user) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
      res.status(200).json({ message: MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY });
    } catch (error) {
      next(error);
    }
  }

  async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.id;
      const availability = await this._proService.getAvailability(proId);
      res.status(200).json(availability);
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
          throw new HttpError(400, "Cannot mark as unavailable while there are booked slots");
        }
      }

      const updatedAvailability = await this._proService.updateAvailability(proId, { availability, isUnavailable });
      res.status(200).json(updatedAvailability);
    } catch (error) {
      next(error);
    }
  }

  async getAllCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await this._proService.getAllCategories();
      res.status(200).json(categories);
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
      const { bookings, total } = await this._proService.fetchProBookings(proId, page, limit, status);
      res.status(200).json({ bookings, total });
    } catch (error) {
      next(error);
    }
  }

  async acceptBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const result = await this._proService.acceptBooking(bookingId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async rejectBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const { rejectedReason } = req.body;
      if (!rejectedReason) throw new HttpError(400, MESSAGES.REJECTION_REASON_REQUIRED);
      const result = await this._proService.rejectBooking(bookingId, rejectedReason);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async generateQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const { laborCost, materialCost, additionalCharges } = req.body;
      const quota = await this._proService.generateQuota(bookingId, { laborCost, materialCost, additionalCharges });
      res.status(201).json(quota);
    } catch (error) {
      next(error);
    }
  }

  async fetchQuotaByBookingId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const quota = await this._proService.fetchQuotaByBookingId(bookingId);
      res.status(200).json(quota);
    } catch (error) {
      next(error);
    }
  }

  async getWallet(req: Request, res: Response) {
    try {
      const { proId } = req.params;
      const wallet = await this._proService.getWallet(proId);
      if (!wallet) throw new HttpError(404, "Wallet not found");
      res.status(200).json(wallet);
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message });
    }
  }

  async getWalletWithPagenation(req: Request, res: Response) {
    try {
      const { proId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const { wallet, total } = await this._proService.getWalletWithPagination(proId, page, limit);
      if (!wallet) throw new HttpError(404, "Wallet not found");
      res.status(200).json({ wallet, total });
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message });
    }
  }

  async requestWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proId = req.params.proId;
      console.log('Logging in controller proId for requestWithdrawal:', proId);
      console.log('Received request body:', req.body); // Add this log
      const { amount, paymentMode, bankName, accountNumber, ifscCode, branchName, upiCode } = req.body;
      if (!amount || amount < 200) throw new HttpError(400, "Minimum withdrawal amount is ₹200.");
      const wallet = await this._proService.getWallet(proId);
      if (!wallet) throw new HttpError(404, MESSAGES.WALLET_NOT_FOUND);
      if (amount > wallet.balance) throw new HttpError(400, "Withdrawal amount cannot exceed wallet balance.");
      if (paymentMode === "bank") {
        if (!bankName || !accountNumber || !ifscCode || !branchName) {
          throw new HttpError(400, "All bank details are required.");
        }
      } else if (paymentMode === "upi") {
        if (!upiCode) throw new HttpError(400, "UPI code is required.");
      }
      const withdrawalRequest = await this._proService.requestWithdrawal(proId, { amount, paymentMode, bankName, accountNumber, ifscCode, branchName, upiCode });
      res.status(201).json(withdrawalRequest);
    } catch (error) {
      next(error);
    }
  }

  async getPendingProById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pendingProId = req.params.id;
    const pendingPro = await this._proService.getPendingProById(pendingProId);
    res.status(200).json(pendingPro);
  } catch (error) {
    next(error);
  }
}
}