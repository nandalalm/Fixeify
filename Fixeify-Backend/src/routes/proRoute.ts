import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { ProController } from "../controllers/proController";

export default function createProRoutes(container: Container): Router {
  const router = express.Router();
  const proController = container.get<ProController>(TYPES.ProController);

  router.post("/apply", proController.applyPro.bind(proController));

  return router;
}