import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { NotificationController } from "../controllers/notificationController";
import { authenticateToken, requireAnyRole } from "../middleware/authMiddleware";

export default function createNotificationRoutes(container: Container): Router {
  const router = express.Router();
  const notificationController = container.get<NotificationController>(TYPES.NotificationController);

  router.get("/:role/:participantId", authenticateToken, requireAnyRole, notificationController.getNotifications.bind(notificationController));
  router.get("/messages/:role/:participantId", authenticateToken, requireAnyRole, notificationController.getMessageNotifications.bind(notificationController));
  router.get("/non-messages/:role/:participantId", authenticateToken, requireAnyRole, notificationController.getNonMessageNotifications.bind(notificationController));
  router.put("/read/:notificationId", authenticateToken, requireAnyRole, notificationController.markNotificationAsRead.bind(notificationController));
  router.put("/read-all/:role/:participantId", authenticateToken, requireAnyRole, notificationController.markAllNotificationsAsRead.bind(notificationController));
  router.put("/read-all-messages/:role/:participantId", authenticateToken, requireAnyRole, notificationController.markAllMessageNotificationsAsRead.bind(notificationController));

  return router;
}