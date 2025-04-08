import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const errorMiddleware = (
  err: HttpError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err.message || "Internal Server Error";
  logger.error(`[Error] ${status}: ${message}`);
  res.status(status).json({ message });
};