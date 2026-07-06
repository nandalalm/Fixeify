import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { ProController } from "../controllers/proController";
import { authenticateToken, requirePro, requireAnyRole } from "../middleware/authMiddleware";

export default function createProRoutes(container: Container): Router {
  const router = express.Router();
  const proController = container.get<ProController>(TYPES.ProController);

  router.post("/apply", proController.applyPro.bind(proController));
  router.get("/fetchProfile/:id", proController.getProfile.bind(proController));
  router.get("/fetchCategories", proController.getAllCategories.bind(proController));
  router.get("/popularCategories", proController.getPopularCategories.bind(proController));
  router.get("/pending/:id", proController.getPendingProById.bind(proController));
  
  router.put("/updateProfile/:id", authenticateToken, requirePro, proController.updateProfile.bind(proController));
  router.put("/changePassword/:id", authenticateToken, requirePro, proController.changePassword.bind(proController));
  router.get("/fetchAvailability/:id", authenticateToken, requireAnyRole, proController.getAvailability.bind(proController));
  router.put("/updateAvailability/:id", authenticateToken, requirePro, proController.updateAvailability.bind(proController));
  router.get("/bookings/:id", authenticateToken, requirePro, proController.fetchProBookings.bind(proController));
  router.get("/booking/:id", authenticateToken, requirePro, proController.getBookingById.bind(proController));
  router.put("/acceptBooking/:id", authenticateToken, requirePro, proController.acceptBooking.bind(proController));
  router.put("/rejectBooking/:id", authenticateToken, requirePro, proController.rejectBooking.bind(proController));
  router.post("/generateQuota/:id", authenticateToken, requirePro, proController.generateQuota.bind(proController));
  router.get("/fetchQuota/:id", authenticateToken, requirePro, proController.fetchQuotaByBookingId.bind(proController));
  router.get("/wallet/:proId", authenticateToken, requirePro, proController.getWallet.bind(proController));
  router.get("/walletWithPagenation/:proId", authenticateToken, requirePro, proController.getWalletWithPagenation.bind(proController));
  router.post("/requestWithdrawal/:proId", authenticateToken, requirePro, proController.requestWithdrawal.bind(proController));
  router.get("/withdrawalRequests/:proId", authenticateToken, requirePro, proController.getWithdrawalRequestsByProId.bind(proController));
  router.get("/dashboard-metrics/:proId", authenticateToken, requirePro, proController.getDashboardMetrics.bind(proController));
  router.get("/monthly-revenue-series/:proId", authenticateToken, requirePro, proController.getMonthlyRevenueSeries.bind(proController));

  return router;
}