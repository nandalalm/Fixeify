import { Request, Response, NextFunction } from "express";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "./errorMiddleware";
import {  verifyAccessToken } from "../utils/jwtUtils";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: "user" | "pro" | "admin";
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, MESSAGES.ACCESS_DENIED);
    }

    const token = authHeader.split(" ")[1];
    if (!token) throw new HttpError(401, MESSAGES.ACCESS_DENIED);

    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    next(err instanceof HttpError ? err : new HttpError(403, MESSAGES.INVALID_TOKEN));
  }
};

export const requireRole = (...allowedRoles: ("user" | "pro" | "admin")[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return next(new HttpError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(req.userRole)) {
      return next(new HttpError(403, `Access denied. Required roles: ${allowedRoles.join(", ")}`));
    }

    next();
  };
};

export const requireUser = requireRole("user");
export const requirePro = requireRole("pro");
export const requireAdmin = requireRole("admin");
export const requireUserOrPro = requireRole("user", "pro");
export const requireProOrAdmin = requireRole("pro", "admin");
export const requireAnyRole = requireRole("user", "pro", "admin");

export const authenticateAndAuthorize = (...allowedRoles: ("user" | "pro" | "admin")[]) => {
  return [
    authenticateToken,
    requireRole(...allowedRoles)
  ];
};