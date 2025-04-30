import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserService } from "../services/IUserService";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";

@injectable()
export class UserController {
  constructor(@inject(TYPES.IUserService) private _userService: IUserService) {}

  async getUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await this._userService.getUserProfile(userId);
      if (!user) throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async updateUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword } = req.body;
      const updatedUser = await this._userService.changePassword(userId, { currentPassword, newPassword });
      if (!updatedUser) throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  }
}