import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { TicketController } from "../controllers/ticketController";
import { authenticateToken, requireAdmin, requireUserOrPro } from "../middleware/authMiddleware";

export default function createTicketRoutes(container: Container): Router {
  const router = express.Router();
  const ticketController = container.get<TicketController>(TYPES.TicketController);

  router.post("/", authenticateToken, requireUserOrPro, ticketController.createTicket.bind(ticketController));
  router.get("/complainant/:complainantId", authenticateToken, requireUserOrPro, ticketController.getTicketsByComplainant.bind(ticketController));
  router.get("/against/:againstId", authenticateToken, requireUserOrPro, ticketController.getTicketsAgainst.bind(ticketController));
  router.get("/ticket/:ticketId", authenticateToken, requireUserOrPro, ticketController.getTicketByTicketId.bind(ticketController));
  router.get("/:id", authenticateToken, requireUserOrPro, ticketController.getTicketById.bind(ticketController));
  router.get("/", authenticateToken, requireAdmin, ticketController.getAllTickets.bind(ticketController));
  router.put("/:id/status", authenticateToken, requireAdmin, ticketController.updateTicketStatus.bind(ticketController));
  router.put("/:id/ban-status", authenticateToken, requireAdmin, ticketController.updateTicketBanStatus.bind(ticketController));
  router.get("/admin/stats", authenticateToken, requireAdmin, ticketController.getTicketStats.bind(ticketController));

  return router;
}
