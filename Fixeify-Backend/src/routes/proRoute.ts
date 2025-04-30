import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { ProController } from "../controllers/proController";
import { authenticateToken } from "../middleware/authMiddleware";

export default function createProRoutes(container: Container): Router {
  const router = express.Router();
  const proController = container.get<ProController>(TYPES.ProController);

  router.post("/apply", proController.applyPro.bind(proController));
  router.get("/getProfile/:userId", authenticateToken, proController.getProfile.bind(proController));
  router.put("/updateProfile/:userId", authenticateToken, proController.updateProfile.bind(proController));
  router.put("/change-password/:userId", authenticateToken, proController.changePassword.bind(proController));

  return router;
}