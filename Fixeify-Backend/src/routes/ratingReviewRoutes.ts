import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { RatingReviewController } from "../controllers/ratingReviewController";
import { authenticateToken, requireUser, requireAnyRole } from "../middleware/authMiddleware";

export default function createRatingReviewRoutes(container: Container): Router {
  const router = express.Router();
  const controller = container.get<RatingReviewController>(TYPES.RatingReviewController);

  router.post("/create", authenticateToken, requireUser, (req, res, next) => { void controller.createRatingReview(req, res, next); });
  router.get("/pro/:proId", authenticateToken, requireAnyRole, (req, res, next) => { void controller.getRatingReviewsByPro(req, res, next); });
  router.get("/user/:userId", authenticateToken, requireAnyRole, (req, res, next) => { void controller.getRatingReviewsByUser(req, res, next); });
  router.get("/all", authenticateToken, requireAnyRole, (req, res, next) => { void controller.getAllRatingReviews(req, res, next); });
  router.get("/fetchSingle/:id", authenticateToken, requireAnyRole, (req, res, next) => { void controller.getRatingReviewById(req, res, next); });

  return router;
}
