import express from "express";
import type { Express } from "express";
import { Container } from "inversify";
import createAuthRoutes from "./authRoutes";
import createAdminRoutes from "./adminRoutes";
import createProRoutes from "./proRoute";
import createUserRoutes from "./userRoutes";
import createStripeRoutes from "./stripeRoutes";
import createChatRoutes from "./chatRoutes";
import createNotificationRoutes from "./notificationRoutes";
import createRatingReviewRoutes from "./ratingReviewRoutes";
import createTicketRoutes from "./ticketRoutes";
import createUploadRoutes from "./uploadRoutes";

const registerRoutes = (app: Express, container: Container): void => {
  app.use("/api/auth", express.json(), createAuthRoutes(container));
  app.use("/api/admin", express.json(), createAdminRoutes(container));
  app.use("/api/pro", express.json(), createProRoutes(container));
  app.use("/api/user", express.json(), createUserRoutes(container));
  app.use("/api/stripe", createStripeRoutes(container));
  app.use("/api/chat", express.json(), createChatRoutes(container));
  app.use("/api/notifications", express.json(), createNotificationRoutes(container));
  app.use("/api/rating-reviews", express.json(), createRatingReviewRoutes(container));
  app.use("/api/tickets", express.json(), createTicketRoutes(container));
  app.use("/api/upload", express.json(), createUploadRoutes(container));
};

export default registerRoutes;
