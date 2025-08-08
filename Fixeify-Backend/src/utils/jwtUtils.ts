import jwt from "jsonwebtoken";
import { HttpError } from "../middleware/errorMiddleware";

export interface JwtPayload {
  userId: string;
  role: "user" | "pro" | "admin";
}

export const generateAccessToken = (userId: string, role: "user" | "pro" | "admin"): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new HttpError(500, "ACCESS_TOKEN_SECRET is not defined");
  return jwt.sign({ userId, role }, secret, { expiresIn: "1h" });
};

export const generateRefreshToken = (userId: string, role: "user" | "pro" | "admin"): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new HttpError(500, "REFRESH_TOKEN_SECRET is not defined");
  return jwt.sign({ userId, role }, secret, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new HttpError(500, "ACCESS_TOKEN_SECRET is not defined");
  return jwt.verify(token, secret) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new HttpError(500, "REFRESH_TOKEN_SECRET is not defined");
  return jwt.verify(token, secret) as JwtPayload;
};