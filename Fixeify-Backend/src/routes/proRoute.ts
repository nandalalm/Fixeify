import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { ProController } from "../controllers/proController";
import { authenticateToken } from "../middleware/authMiddleware";

export default function createProRoutes(container: Container): Router {
  const router = express.Router();
  const proController = container.get<ProController>(TYPES.ProController);

  router.post("/apply", proController.applyPro.bind(proController));
  router.get("/fetchProfile/:id", proController.getProfile.bind(proController));
  router.get("/fetchCategories", proController.getAllCategories.bind(proController));
  router.get("/pending/:id", proController.getPendingProById.bind(proController));
  
  router.put("/updateProfile/:id", authenticateToken, proController.updateProfile.bind(proController));
  router.put("/changePassword/:id", authenticateToken, proController.changePassword.bind(proController));
  router.get("/fetchAvailability/:id", authenticateToken, proController.getAvailability.bind(proController));
  router.put("/updateAvailability/:id", authenticateToken, proController.updateAvailability.bind(proController));
  router.get("/bookings/:id", authenticateToken, proController.fetchProBookings.bind(proController));
  router.get("/booking/:id", authenticateToken, proController.getBookingById.bind(proController));
  router.put("/acceptBooking/:id", authenticateToken, proController.acceptBooking.bind(proController));
  router.put("/rejectBooking/:id", authenticateToken, proController.rejectBooking.bind(proController));
  router.post("/generateQuota/:id", authenticateToken, proController.generateQuota.bind(proController));
  router.get("/fetchQuota/:id", authenticateToken, proController.fetchQuotaByBookingId.bind(proController));
  router.get("/wallet/:proId", authenticateToken, proController.getWallet.bind(proController));
  router.get("/walletWithPagenation/:proId", authenticateToken, proController.getWalletWithPagenation.bind(proController));
  router.post("/requestWithdrawal/:proId", authenticateToken, proController.requestWithdrawal.bind(proController));
  router.get("/withdrawalRequests/:proId", authenticateToken, proController.getWithdrawalRequestsByProId.bind(proController));
  router.get("/dashboard-metrics/:proId", authenticateToken, proController.getDashboardMetrics.bind(proController));
  router.get("/monthly-revenue-series/:proId", authenticateToken, proController.getMonthlyRevenueSeries.bind(proController));

  return router;
}