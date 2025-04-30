import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IProService } from "../services/IProService";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";

interface AuthRequest extends Request {
  userId?: string;
}

@injectable()
export class ProController {
  constructor(@inject(TYPES.IProService) private _proService: IProService) {}

  async applyPro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proData = req.body;
      const { message, pendingPro } = await this._proService.applyPro(proData);
      res.status(201).json({ message, pendingPro });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      if (!req.userId || req.userId !== userId) {
        throw new HttpError(403, MESSAGES.ACCESS_DENIED);
      }
      const pro = await this._proService.getProfile(userId);
      res.status(200).json(pro);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { firstName, lastName, phoneNumber, location, profilePhoto, about } = req.body;
      const updatedPro = await this._proService.updateProfile(userId, {
        firstName,
        lastName,
        phoneNumber,
        location,
        profilePhoto,
        about,
      });
      res.status(200).json(updatedPro);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      if (!req.userId || req.userId !== userId) {
        throw new HttpError(403, MESSAGES.ACCESS_DENIED);
      }
      const { currentPassword, newPassword } = req.body;
      const updatedUser = await this._proService.changePassword(userId, { currentPassword, newPassword });
      if (!updatedUser) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  }
}