import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IProService } from "../services/IProService";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";

@injectable()
export class ProController {
  constructor(@inject(TYPES.IProService) private _proService: IProService) {}

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
      const { availability, isUnavailable } = req.body;
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
      const bookings = await this._proService.fetchProBookings(proId);
      res.status(200).json(bookings);
    } catch (error) {
      next(error);
    }
  }
}