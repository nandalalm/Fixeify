import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { ProController } from "../controllers/proController";

export default function createProRoutes(container: Container): Router {
  const router = express.Router();
  const proController = container.get<ProController>(TYPES.ProController);

  router.post("/apply", proController.applyPro.bind(proController));
  router.get("/fetchProfile/:id", proController.getProfile.bind(proController));
  router.put("/updateProfile/:id", proController.updateProfile.bind(proController));
  router.put("/changePassword/:id", proController.changePassword.bind(proController));
  router.get("/fetchAvailability/:id", proController.getAvailability.bind(proController));
  router.put("/updateAvailability/:id", proController.updateAvailability.bind(proController));
  router.get("/fetchCategories", proController.getAllCategories.bind(proController));
  router.get("/bookings/:id", proController.fetchProBookings.bind(proController));

  return router;
}