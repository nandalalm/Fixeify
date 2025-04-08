import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IAdminService } from "../services/IAdminService";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";
import { UserResponse } from "../dtos/response/userDtos";
import { IPendingPro } from "../models/pendingProModel"; // Import IPendingPro

@injectable()
export class AdminController {
  constructor(@inject(TYPES.IAdminService) private _adminService: IAdminService) {}

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
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

  async getPendingPros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
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
}