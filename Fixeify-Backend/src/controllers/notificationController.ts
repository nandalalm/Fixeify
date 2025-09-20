import { injectable, inject } from "inversify";
import { Request, Response } from "express";
import { INotificationService } from "../services/INotificationService";
import { TYPES } from "../types";
import { UserRole } from "../enums/roleEnum";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";

@injectable()
export class NotificationController {
  constructor(@inject(TYPES.INotificationService) private _notificationService: INotificationService) { }

  private isUserRole(role: unknown): role is UserRole {
    return typeof role === "string" && Object.values(UserRole).includes(role as UserRole);
  }

  async getNotifications(req: Request, res: Response): Promise<void> {
    const { role, participantId } = req.params;
    const { page = 1, limit = 10, filter = 'all' } = req.query;

    try {
      if (!participantId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : role === UserRole.ADMIN ? "Admin" : "User";
      const result = await this._notificationService.getNotifications(
        participantId,
        participantModel,
        Number(page),
        Number(limit),
        filter === 'unread' ? 'unread' : 'all'
      );
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error(MESSAGES.FAILED_TO_FETCH_NOTIFICATIONS, {
        error: (error as Error).message,
        participantId,
        role,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_FETCH_NOTIFICATIONS, error: (error as Error).message });
    }
  }

  async markNotificationAsRead(req: Request, res: Response): Promise<void> {
    const { notificationId } = req.params;

    try {
      if (!notificationId) throw new Error(MESSAGES.NOTIFICATIONID_REQUIRED);
      await this._notificationService.markNotificationAsRead(notificationId);
      res.status(HttpStatus.OK).json({ message: MESSAGES.NOTIFICATION_MARKED_AS_READ });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_MARK_NOTIFICATION_AS_READ, error: (error as Error).message });
    }
  }

  async markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
    const { role, participantId } = req.params;

    try {
      if (!participantId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : role === UserRole.ADMIN ? "Admin" : "User";
      await this._notificationService.markAllNotificationsAsRead(participantId, participantModel);
      res.status(HttpStatus.OK).json({ message: MESSAGES.ALL_NOTIFICATIONS_MARKED_AS_READ });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_MARK_ALL_NOTIFICATIONS_AS_READ, error: (error as Error).message });
    }
  }

  async getMessageNotifications(req: Request, res: Response): Promise<void> {
    const { role, participantId } = req.params;
    const { page = 1, limit = 10, filter = 'all' } = req.query;

    try {
      if (!participantId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : role === UserRole.ADMIN ? "Admin" : "User";
      const result = await this._notificationService.getMessageNotifications(
        participantId,
        participantModel,
        Number(page),
        Number(limit),
        filter === 'unread' ? 'unread' : 'all'
      );
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error("Failed to fetch message notifications", {
        error: (error as Error).message,
        participantId,
        role,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to fetch message notifications", error: (error as Error).message });
    }
  }

  async getNonMessageNotifications(req: Request, res: Response): Promise<void> {
    const { role, participantId } = req.params;
    const { page = 1, limit = 10, filter = 'all' } = req.query;

    try {
      if (!participantId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : role === UserRole.ADMIN ? "Admin" : "User";
      const result = await this._notificationService.getNonMessageNotifications(
        participantId,
        participantModel,
        Number(page),
        Number(limit),
        filter === 'unread' ? 'unread' : 'all'
      );
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error("Failed to fetch non-message notifications", {
        error: (error as Error).message,
        participantId,
        role,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to fetch non-message notifications", error: (error as Error).message });
    }
  }

  async markAllMessageNotificationsAsRead(req: Request, res: Response): Promise<void> {
    const { role, participantId } = req.params;

    try {
      if (!participantId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : role === UserRole.ADMIN ? "Admin" : "User";
      await this._notificationService.markAllMessageNotificationsAsRead(participantId, participantModel);
      res.status(HttpStatus.OK).json({ message: "All message notifications marked as read" });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to mark all message notifications as read", error: (error as Error).message });
    }
  }
}