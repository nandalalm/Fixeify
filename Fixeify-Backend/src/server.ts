import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { Server } from "http";
import bootstrapServer from "./bootstrap";
import container from "./container";
import registerRoutes from "./routes";
import { TYPES } from "./types";
import { ChatGateway } from "./chatGateway";
import { errorMiddleware, HttpError } from "./middleware/errorMiddleware";
import { HttpStatus } from "./enums/httpStatus";
import { MESSAGES } from "./constants/messages";
import "./models/notificationModel";
import "./models/chatModel";
import "./models/messageModel";

dotenv.config();

const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const app = express();
const server = new Server(app);

const accessLogStream = fs.createWriteStream(path.join(logDir, "access.log"), { flags: "a" });
app.use(morgan("combined", { stream: accessLogStream }));

if (!process.env.FRONTEND_URL && !process.env.FRONTEND_URLS) {
  throw new Error("No Frontend URL(s)");
}

const allowedOrigins = [process.env.FRONTEND_URL!];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(
  cors({
    credentials: true,
    origin: allowedOrigins,
  })
);
app.use(cookieParser());
app.use(express.static("public"));

registerRoutes(app, container);

app.use((req, _res, next) => {
  next(new HttpError(HttpStatus.NOT_FOUND, `${MESSAGES.NOT_FOUND}: ${req.originalUrl}`));
});

app.use(errorMiddleware);

const chatGateway = container.get<ChatGateway>(TYPES.ChatGateway);
chatGateway.init(server);

bootstrapServer(server, container);
