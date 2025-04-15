import { UserResponse } from "../dtos/response/userDtos";
import { injectable, inject } from "inversify";
import { Request, Response, NextFunction } from "express";
import { TYPES } from "../types";
import { IAdminService } from "../services/IAdminService";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";
import { ProResponse } from "../dtos/response/proDtos";

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

  async banPro(
    req: Request<{ proId: string }, ProResponse | { message: string }, { isBanned: boolean }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { proId } = req.params;
      const { isBanned } = req.body;
      const updatedPro = await this._adminService.banPro(proId, isBanned);
      if (!updatedPro) throw new HttpError(404, "Pro not found");
      res.status(200).json(updatedPro);
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

  async approvePro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { about } = req.body;
      await this._adminService.approvePro(id, about || null);
      res.status(200).json({ message: "Pro approved successfully" });
    } catch (error) {
      next(error);
    }
  }

  async rejectPro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) throw new HttpError(400, "Rejection reason is required");
      await this._adminService.rejectPro(id, reason);
      res.status(200).json({ message: "Pro rejected successfully" });
    } catch (error) {
      next(error);
    }
  }

  async getApprovedPros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
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
}