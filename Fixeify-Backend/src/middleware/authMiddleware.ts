import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "./errorMiddleware";

interface AuthRequest extends Request {
  userId?: string; 
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, MESSAGES.ACCESS_DENIED);
    }

    const token = authHeader.split(" ")[1];
    if (!token) throw new HttpError(401, MESSAGES.ACCESS_DENIED);

    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) throw new HttpError(500, "Server configuration error: ACCESS_TOKEN_SECRET not set");

    
    const decoded = jwt.verify(token, secret) as { userId: string };
    req.userId = decoded.userId; 
    next();
  } catch (err) {
    next(err instanceof HttpError ? err : new HttpError(403, MESSAGES.INVALID_TOKEN));
  }
};