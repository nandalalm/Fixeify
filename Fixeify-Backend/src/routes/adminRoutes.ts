import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { AdminController } from "../controllers/adminController";
import { authenticateToken } from "../middleware/authMiddleware";

export default function createAdminRoutes(container: Container): Router {
  const router = express.Router();
  const adminController = container.get<AdminController>(TYPES.AdminController);

  router.get("/", authenticateToken, adminController.getUsers.bind(adminController));
  router.put("/users/:userId/ban", authenticateToken, adminController.banUser.bind(adminController));
  router.put("/approved-pros/:proId/ban", authenticateToken, adminController.banPro.bind(adminController));
  router.get("/pending-pros", authenticateToken, adminController.getPendingPros.bind(adminController));
  router.get("/pending-pros/:id", authenticateToken, adminController.getPendingProById.bind(adminController));
  router.post("/pending-pros/:id/approve", authenticateToken, adminController.approvePro.bind(adminController));
  router.post("/pending-pros/:id/reject", authenticateToken, adminController.rejectPro.bind(adminController));
  router.get("/approved-pros", authenticateToken, adminController.getApprovedPros.bind(adminController));
  router.get("/approved-pros/:id", authenticateToken, adminController.getApprovedProById.bind(adminController));

  return router;
}
