import { injectable, inject } from "inversify";
import { Request, Response } from "express";
import { INotificationService } from "../services/INotificationService";
import { TYPES } from "../types";
import { AuthRequest } from "../middleware/authMiddleware";
import { UserRole } from "../enums/roleEnum";
import { MESSAGES } from "../constants/messages";

@injectable()
export class NotificationController {
  constructor(@inject(TYPES.INotificationService) private notificationService: INotificationService) {}

  private isUserRole(role: unknown): role is UserRole {
    return typeof role === "string" && Object.values(UserRole).includes(role as UserRole);
  }

  async getNotifications(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { role, participantId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
      if (!participantId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      const result = await this.notificationService.getNotifications(participantId, participantModel, Number(page), Number(limit));
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getNotifications:", {
        error: (error as Error).message,
        participantId,
        role,
      });
      res.status(500).json({ message: "Failed to fetch notifications", error: (error as Error).message });
    }
  }

  async markNotificationAsRead(req: Request, res: Response): Promise<void> {
    const { notificationId } = req.params;

    try {
      if (!notificationId) throw new Error("notificationId is required");
      await this.notificationService.markNotificationAsRead(notificationId);
      res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read", error: (error as Error).message });
    }
  }

  async markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthRequest;
    const { role, participantId } = req.params;

    try {
      if (!participantId) throw new Error(MESSAGES.UNAUTHORIZED);
      if (!role || !this.isUserRole(role)) {
        throw new Error(MESSAGES.VALID_ROLE_REQUIRED);
      }
      const participantModel = role === UserRole.PRO ? "ApprovedPro" : "User";
      await this.notificationService.markAllNotificationsAsRead(participantId, participantModel);
      res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read", error: (error as Error).message });
    }
  }
}