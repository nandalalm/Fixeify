import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const isProduction = process.env.NODE_ENV === "production";

export const errorMiddleware = (
  err: HttpError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err instanceof HttpError ? err.status : HttpStatus.INTERNAL_SERVER_ERROR;
  const isOperationalError = err instanceof HttpError;
  const message = isOperationalError || !isProduction
    ? err.message || MESSAGES.SERVER_ERROR
    : MESSAGES.SERVER_ERROR;

  logger.error({
    message: err.message,
    method: req.method,
    path: req.originalUrl,
    status,
    stack: err.stack,
  });

  res.status(status).json({ message });
};
