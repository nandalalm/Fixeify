import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { NotificationController } from "../controllers/notificationController";
import { authenticateToken } from "../middleware/authMiddleware";

export default function createNotificationRoutes(container: Container): Router {
  const router = express.Router();
  const notificationController = container.get<NotificationController>(TYPES.NotificationController);

  router.get("/:role/:participantId", authenticateToken, notificationController.getNotifications.bind(notificationController));
  router.put("/read/:notificationId", authenticateToken, notificationController.markNotificationAsRead.bind(notificationController));
  router.put("/read-all/:role/:participantId", authenticateToken, notificationController.markAllNotificationsAsRead.bind(notificationController));

  return router;
}