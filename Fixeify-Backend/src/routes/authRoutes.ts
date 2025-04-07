import express, { Router } from "express";
import { Container } from "inversify";
import { AuthController } from "../controllers/AuthController";
import { TYPES } from "../types";

export default function createAuthRoutes(container: Container): Router {
  const router = express.Router();
  const authController = container.get<AuthController>(TYPES.AuthController);

  router.post("/send-otp", authController.sendOtp.bind(authController));
  router.post("/verify-otp", authController.verifyOtp.bind(authController));
  router.post("/register", authController.register.bind(authController));
  router.post("/login", authController.login.bind(authController));
  router.post("/refresh", authController.refresh.bind(authController));

  return router;
}