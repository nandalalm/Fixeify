import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { UserController } from "../controllers/userController";
import { authenticateToken } from "../middleware/authMiddleware";

export default function createUserRoutes(container: Container): Router {
  const router = express.Router();
  const userController = container.get<UserController>(TYPES.UserController);

  router.get("/fetchProfile/:userId", authenticateToken, userController.getUserProfile.bind(userController));
  router.put("/updateProfile/:userId", authenticateToken, userController.updateUserProfile.bind(userController));
  router.put("/changePassword/:userId", authenticateToken, userController.changePassword.bind(userController));
  router.get("/nearbyPros", authenticateToken, userController.getNearbyPros.bind(userController));
  router.post("/book", authenticateToken, userController.createBooking.bind(userController));
  router.get("/bookings/:userId", authenticateToken, userController.fetchBookingDetails.bind(userController));

  return router;
}