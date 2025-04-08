import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { AdminController } from "../controllers/adminController";
import { authenticateToken } from "../middleware/authMiddleware";

export default function createAdminRoutes(container: Container): Router {
  const router = express.Router();
  const adminController = container.get<AdminController>(TYPES.AdminController);

  router.get("/", authenticateToken, adminController.getUsers.bind(adminController));
  router.put("/:userId/ban", authenticateToken, adminController.banUser.bind(adminController));
  router.get("/pending-pros", authenticateToken, adminController.getPendingPros.bind(adminController)); // Move to AdminController
  router.get("/pending-pros/:id", authenticateToken, adminController.getPendingProById.bind(adminController));

  return router;
}