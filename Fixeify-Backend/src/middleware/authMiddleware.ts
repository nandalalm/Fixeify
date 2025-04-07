import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
  user?: { userId: string };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access Denied" });
  }

  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "Server configuration error: ACCESS_TOKEN_SECRET not set" });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid Token" });
    }
    req.user = decoded as { userId: string };
    next();
  });
};
