import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { AuthController } from "../controllers/tempAuthController";
import { authenticateToken } from "../middleware/authMiddleware";
import cookieParser from "cookie-parser";

export default function createAuthRoutes(container: Container): Router {
  const router = express.Router();
  const authController = container.get<AuthController>(TYPES.AuthController);

  router.use(cookieParser());

  router.post("/send-otp", authController.sendOtp.bind(authController));
  router.post("/verify-otp", authController.verifyOtp.bind(authController));
  router.post("/register", authController.register.bind(authController));
  router.post("/login", authController.login.bind(authController));
  router.post("/google-login", authController.googleLogin.bind(authController));
  router.post("/forgot-password", authController.forgotPassword.bind(authController));
  router.post("/reset-password", authController.resetPassword.bind(authController));
  router.post("/refresh-token", authController.refreshToken.bind(authController));
  router.get("/me", authenticateToken, authController.getMe.bind(authController));
  router.post("/logout", authenticateToken, authController.logout.bind(authController));
  router.get("/check-ban/:userId", authenticateToken, authController.checkBanStatus.bind(authController));

  return router;
}