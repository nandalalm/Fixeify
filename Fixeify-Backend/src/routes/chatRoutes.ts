import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { ChatController } from "../controllers/chatController";
import { authenticateToken, requireAnyRole } from "../middleware/authMiddleware";

export default function createChatRoutes(container: Container): Router {
  const router = express.Router();
  const chatController = container.get<ChatController>(TYPES.ChatController);

  router.post("/create", authenticateToken, requireAnyRole, chatController.createChat.bind(chatController));
  router.get("/existing/:role/:userId/:proId", authenticateToken, requireAnyRole, chatController.getExistingChat.bind(chatController));
  router.get("/:role/:userId/chats", authenticateToken, requireAnyRole, chatController.getChats.bind(chatController));
  router.post("/messages", authenticateToken, requireAnyRole, chatController.sendMessage.bind(chatController));
  router.get("/messages/:chatId", authenticateToken, requireAnyRole, chatController.getMessages.bind(chatController));
  router.put("/messages/read/:chatId", authenticateToken, requireAnyRole, chatController.markMessagesAsRead.bind(chatController));

  return router;
}