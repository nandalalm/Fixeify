import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { UserController } from "../controllers/userController";

export default function createStripeRoutes(container: Container): Router {
  const router = express.Router();
  const userController = container.get<UserController>(TYPES.UserController);

  router.post("/webhook", express.raw({ type: "application/json" }), userController.handleWebhook.bind(userController));

  return router;
}