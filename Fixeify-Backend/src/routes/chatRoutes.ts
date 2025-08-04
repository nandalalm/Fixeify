import express, { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { ChatController } from "../controllers/chatController";
import { authenticateToken } from "../middleware/authMiddleware";

export default function createChatRoutes(container: Container): Router {
  const router = express.Router();
  const chatController = container.get<ChatController>(TYPES.ChatController);

  router.post("/create", authenticateToken, chatController.createChat.bind(chatController));
  router.get("/existing/:role/:userId/:proId", authenticateToken, chatController.getExistingChat.bind(chatController));
  router.get("/:role/:userId/chats", authenticateToken, chatController.getChats.bind(chatController));
  router.post("/messages", authenticateToken, chatController.sendMessage.bind(chatController));
  router.get("/messages/:chatId", authenticateToken, chatController.getMessages.bind(chatController));
  router.put("/messages/read/:chatId", authenticateToken, chatController.markMessagesAsRead.bind(chatController));

  return router;
}