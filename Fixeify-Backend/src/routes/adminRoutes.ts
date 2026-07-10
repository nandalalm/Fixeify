import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { AdminController } from "../controllers/adminController";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware";

export default function createAdminRoutes(container: Container): Router {
  const router = express.Router();
  const adminController = container.get<AdminController>(TYPES.AdminController);

  router.get("/fetchUsers", authenticateToken, requireAdmin, adminController.getUsers.bind(adminController));
  router.put("/banUsers/:userId", authenticateToken, requireAdmin, adminController.banUser.bind(adminController));
  router.put("/banApproved-pros/:proId", authenticateToken, requireAdmin, adminController.banPro.bind(adminController));
  router.get("/fetchPending-pros", authenticateToken, requireAdmin, adminController.getPendingPros.bind(adminController));
  router.get("/fetchPending-pro/:id", authenticateToken, requireAdmin, adminController.getPendingProById.bind(adminController));
  router.post("/approvePending-pros/:id", authenticateToken, requireAdmin, adminController.approvePro.bind(adminController));
  router.post("/rejectPending-pros/:id", authenticateToken, requireAdmin, adminController.rejectPro.bind(adminController));
  router.get("/fetchApproved-pros", authenticateToken, requireAdmin, adminController.getApprovedPros.bind(adminController));
  router.get("/fetchApproved-pro/:id", authenticateToken, requireAdmin, adminController.getApprovedProById.bind(adminController));
  router.post("/addCategories", authenticateToken, requireAdmin, adminController.createCategory.bind(adminController));
  router.get("/fetchCategories", authenticateToken, requireAdmin, adminController.getCategories.bind(adminController));
  router.put("/updateCategories/:categoryId", authenticateToken, requireAdmin, adminController.updateCategory.bind(adminController));
  router.get("/fetchBookings", authenticateToken, requireAdmin, adminController.getBookings.bind(adminController));
  router.get("/booking/:bookingId", authenticateToken, requireAdmin, adminController.getBookingById.bind(adminController));
  router.get("/fetchQuota/:bookingId", authenticateToken, requireAdmin, adminController.getQuotaByBookingId.bind(adminController));
  router.get("/fetchWithdrawalRequests", authenticateToken, requireAdmin, adminController.getWithdrawalRequests.bind(adminController));
  router.post("/acceptWithdrawalRequest/:withdrawalId", authenticateToken, requireAdmin, adminController.acceptWithdrawalRequest.bind(adminController));
  router.post("/rejectWithdrawalRequest/:withdrawalId", authenticateToken, requireAdmin, adminController.rejectWithdrawalRequest.bind(adminController));
  router.get("/trending-service", authenticateToken, requireAdmin, adminController.getTrendingService.bind(adminController));
  router.get("/admin-transactions", authenticateToken, requireAdmin, adminController.getAdminTransactions.bind(adminController));
  router.get("/dashboard-metrics", authenticateToken, requireAdmin, adminController.getDashboardMetrics.bind(adminController));
  router.get("/monthly-revenue-series", authenticateToken, requireAdmin, adminController.getMonthlyRevenueSeries.bind(adminController));
  router.get("/platform-pro-monthly-revenue-series", authenticateToken, requireAdmin, adminController.getPlatformProMonthlyRevenueSeries.bind(adminController));

  return router;
}
