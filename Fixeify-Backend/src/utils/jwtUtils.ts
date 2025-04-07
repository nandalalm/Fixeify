// utils/jwtUtils.ts
import jwt from "jsonwebtoken";

export const generateAccessToken = (userId: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined in environment variables");
  }
  return jwt.sign({ userId }, secret, { expiresIn: "15m" });
};

export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
  }
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string): { userId: string } => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined in environment variables");
  }
  return jwt.verify(token, secret) as { userId: string };
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
  }
  return jwt.verify(token, secret) as { userId: string };
};