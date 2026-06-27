import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { UserController } from "../controllers/userController";
import { authenticateToken, requireUser } from "../middleware/authMiddleware";

export default function createUserRoutes(container: Container): Router {
  const router = express.Router();
  const userController = container.get<UserController>(TYPES.UserController);

  router.get("/fetchProfile/:userId", authenticateToken, requireUser, userController.getUserProfile.bind(userController));
  router.put("/updateProfile/:userId", authenticateToken, requireUser, userController.updateUserProfile.bind(userController));
  router.put("/changePassword/:userId", authenticateToken, requireUser, userController.changePassword.bind(userController));
  router.get("/nearbyPros", authenticateToken, requireUser, userController.getNearbyPros.bind(userController));
  router.post("/book", authenticateToken, requireUser, userController.createBooking.bind(userController));
  router.get("/bookings/:userId", authenticateToken, requireUser, userController.fetchBookingDetails.bind(userController));
  router.get("/bookings/history/:userId", authenticateToken, requireUser, userController.fetchBookingHistoryDetails.bind(userController));
  router.post("/create-payment-intent", authenticateToken, requireUser, userController.createPaymentIntent.bind(userController));
  router.get("/booking/:bookingId", authenticateToken, requireUser, userController.getBookingById.bind(userController));
  router.get("/quota/by-booking/:bookingId", authenticateToken, requireUser, userController.getQuotaByBookingId.bind(userController));
  router.post("/bookings/:userId/cancel", authenticateToken, requireUser, userController.cancelBooking.bind(userController));

  return router;
}