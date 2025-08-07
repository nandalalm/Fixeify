import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { RatingReviewController } from "../controllers/ratingReviewController";
import { authenticateToken } from "../middleware/authMiddleware";

export default function createRatingReviewRoutes(container: Container): Router {
  const router = express.Router();
  const controller = container.get<RatingReviewController>(TYPES.RatingReviewController);

  // Create a new rating/review
  router.post("/create", authenticateToken, (req, res, next) => { void controller.createRatingReview(req, res, next); });

  // Get paginated reviews for a pro
  router.get("/pro/:proId", authenticateToken, (req, res, next) => { void controller.getRatingReviewsByPro(req, res, next); });

  // Get paginated reviews by a user
  router.get("/user/:userId", authenticateToken, (req, res, next) => { void controller.getRatingReviewsByUser(req, res, next); });

  // Admin: Get paginated list of all reviews
  router.get("/all", authenticateToken, (req, res, next) => { void controller.getAllRatingReviews(req, res, next); });

  // Get a single rating/review by ID
  router.get("/fetchSingle/:id", authenticateToken, (req, res, next) => { void controller.getRatingReviewById(req, res, next); });

  return router;
}
