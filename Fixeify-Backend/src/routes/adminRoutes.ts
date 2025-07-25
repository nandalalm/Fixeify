import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { AdminController } from "../controllers/adminController";
import { authenticateToken } from "../middleware/authMiddleware";

export default function createAdminRoutes(container: Container): Router {
  const router = express.Router();
  const adminController = container.get<AdminController>(TYPES.AdminController);

  router.get("/fetchUsers", authenticateToken, adminController.getUsers.bind(adminController));
  router.put("/banUsers/:userId", authenticateToken, adminController.banUser.bind(adminController));
  router.put("/banApproved-pros/:proId", authenticateToken, adminController.banPro.bind(adminController));
  router.get("/fetchPending-pros", authenticateToken, adminController.getPendingPros.bind(adminController));
  router.get("/fetchPending-pro/:id", authenticateToken, adminController.getPendingProById.bind(adminController));
  router.post("/approvePending-pros/:id", authenticateToken, adminController.approvePro.bind(adminController));
  router.post("/rejectPending-pros/:id", authenticateToken, adminController.rejectPro.bind(adminController));
  router.get("/fetchApproved-pros", authenticateToken, adminController.getApprovedPros.bind(adminController));
  router.get("/fetchApproved-pro/:id", authenticateToken, adminController.getApprovedProById.bind(adminController));
  router.post("/addCategories", authenticateToken, adminController.createCategory.bind(adminController));
  router.get("/fetchCategories", authenticateToken, adminController.getCategories.bind(adminController));
  router.put("/updateCategories/:categoryId", authenticateToken, adminController.updateCategory.bind(adminController));
  router.get("/fetchBookings", authenticateToken, adminController.getBookings.bind(adminController));
  router.get("/fetchQuota/:bookingId", authenticateToken, adminController.getQuotaByBookingId.bind(adminController));
  router.get("/fetchWithdrawalRequests", authenticateToken, adminController.getWithdrawalRequests.bind(adminController));
  router.post("/acceptWithdrawalRequest/:withdrawalId", authenticateToken, adminController.acceptWithdrawalRequest.bind(adminController));
  router.post("/rejectWithdrawalRequest/:withdrawalId", authenticateToken, adminController.rejectWithdrawalRequest.bind(adminController));
  router.get("/trending-service", authenticateToken, adminController.getTrendingService.bind(adminController));
   router.get("/dashboard-metrics", authenticateToken, adminController.getDashboardMetrics.bind(adminController));

  return router;
}