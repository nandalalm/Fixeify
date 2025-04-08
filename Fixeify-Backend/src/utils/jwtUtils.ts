import jwt from "jsonwebtoken";
import { HttpError } from "../middleware/errorMiddleware";

export const generateAccessToken = (userId: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new HttpError(500, "ACCESS_TOKEN_SECRET is not defined");
  return jwt.sign({ userId }, secret, { expiresIn: "15m" });
};

export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new HttpError(500, "REFRESH_TOKEN_SECRET is not defined");
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string): { userId: string } => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new HttpError(500, "ACCESS_TOKEN_SECRET is not defined");
  return jwt.verify(token, secret) as { userId: string };
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new HttpError(500, "REFRESH_TOKEN_SECRET is not defined");
  return jwt.verify(token, secret) as { userId: string };
};