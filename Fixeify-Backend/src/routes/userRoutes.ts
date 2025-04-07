import express, { Router, Request, Response, RequestHandler } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { MongoUserRepository } from "../repositories/MongoUserRepository";

interface BanRequestBody {
  isBanned: boolean;
}

export default function createUserRoutes(container: Container): Router {
  const router = express.Router();
  const userRepository = container.get<MongoUserRepository>(TYPES.IUserRepository);


  const getUsers: RequestHandler = (req, res) => {
    console.log("GET /api/users called");
    userRepository
      .getAllUsers()
      .then((users) => {
        console.log("Fetched users:", users);
        res.status(200).json(users);
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
      });
  };
  router.get("/", getUsers);

  const banUser: RequestHandler<{ userId: string }, any, BanRequestBody> = (req, res) => {
    const { userId } = req.params;
    const { isBanned } = req.body;
    console.log(`PUT /api/users/${userId}/ban called with isBanned: ${isBanned}`);

    userRepository
      .updateBanStatus(userId, isBanned)
      .then((updatedUser) => {
        if (!updatedUser) {
          console.log(`User with ID ${userId} not found`);
          return res.status(404).json({ message: "User not found" });
        }
        console.log("Updated user:", updatedUser);
        res.status(200).json(updatedUser);
      })
      .catch((error) => {
        console.error(`Error updating ban status for user ${userId}:`, error);
        res.status(500).json({ message: "Failed to update ban status" });
      });
  };
  router.put("/:userId/ban", banUser);

  return router;
}