import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { TicketController } from "../controllers/ticketController";
import { authenticateToken } from "../middleware/authMiddleware";

export default function createTicketRoutes(container: Container): Router {
  const router = express.Router();
  const ticketController = container.get<TicketController>(TYPES.TicketController);

  router.post("/", authenticateToken, ticketController.createTicket.bind(ticketController));
  router.get("/complainant/:complainantId", authenticateToken, ticketController.getTicketsByComplainant.bind(ticketController));
  router.get("/against/:againstId", authenticateToken, ticketController.getTicketsAgainst.bind(ticketController));
  router.get("/ticket/:ticketId", authenticateToken, ticketController.getTicketByTicketId.bind(ticketController));
  router.get("/:id", authenticateToken, ticketController.getTicketById.bind(ticketController));
  router.get("/", authenticateToken, ticketController.getAllTickets.bind(ticketController));
  router.put("/:id/status", authenticateToken, ticketController.updateTicketStatus.bind(ticketController));
  router.get("/admin/stats", authenticateToken, ticketController.getTicketStats.bind(ticketController));

  return router;
}
