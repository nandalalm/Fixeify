import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import DatabaseConnector from "./config/databaseConnector";
import createAuthRoutes from "./routes/authRoutes";
import createAdminRoutes from "./routes/adminRoutes";
import createProRoutes from "./routes/proRoute";
import createUserRoutes from "./routes/userRoutes";
import { Container } from "inversify";
import { TYPES } from "./types";
import { AuthController } from "./controllers/authController";
import { AdminController } from "./controllers/adminController";
import { ProController } from "./controllers/proController";
import { UserController } from "./controllers/userController";
import { AuthService } from "./services/AuthService";
import { AdminService } from "./services/AdminService";
import { ProService } from "./services/ProService";
import { UserService } from "./services/UserService";
import { IUserRepository } from "./repositories/IUserRepository";
import { IAdminRepository } from "./repositories/IAdminRepository";
import { IProRepository } from "./repositories/IProRepository";
import { ICategoryRepository } from "./repositories/ICategoryRepository";
import { IBookingRepository } from "./repositories/IBookingRepository";
import { IQuotaRepository } from "./repositories/IQuotaRepository";
import { MongoUserRepository } from "./repositories/mongoUserRepository";
import { MongoAdminRepository } from "./repositories/mongoAdminRepository";
import { MongoProRepository } from "./repositories/mongoProRepository";
import { MongoCategoryRepository } from "./repositories/mongoCategoryRepository";
import { MongoBookingRepository } from "./repositories/mongoBookingRepository";
import { MongoQuotaRepository } from "./repositories/mongoQuotaRepository";
import { errorMiddleware } from "./middleware/errorMiddleware";

dotenv.config();

const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const container = new Container();
container.bind<DatabaseConnector>(TYPES.DatabaseConnector).to(DatabaseConnector).inSingletonScope();
container.bind<IUserRepository>(TYPES.IUserRepository).to(MongoUserRepository).inSingletonScope();
container.bind<IAdminRepository>(TYPES.IAdminRepository).to(MongoAdminRepository).inSingletonScope();
container.bind<IProRepository>(TYPES.IProRepository).to(MongoProRepository).inSingletonScope();
container.bind<ICategoryRepository>(TYPES.ICategoryRepository).to(MongoCategoryRepository).inSingletonScope();
container.bind<IBookingRepository>(TYPES.IBookingRepository).to(MongoBookingRepository).inSingletonScope();
container.bind<IQuotaRepository>(TYPES.IQuotaRepository).to(MongoQuotaRepository).inSingletonScope();
container.bind<AuthService>(TYPES.AuthService).to(AuthService).inSingletonScope();
container.bind<AdminService>(TYPES.IAdminService).to(AdminService).inSingletonScope();
container.bind<ProService>(TYPES.IProService).to(ProService).inSingletonScope();
container.bind<UserService>(TYPES.IUserService).to(UserService).inSingletonScope();
container.bind<AuthController>(TYPES.AuthController).to(AuthController).inSingletonScope();
container.bind<AdminController>(TYPES.AdminController).to(AdminController).inSingletonScope();
container.bind<ProController>(TYPES.ProController).to(ProController).inSingletonScope();
container.bind<UserController>(TYPES.UserController).to(UserController).inSingletonScope();

const app = express();

const accessLogStream = fs.createWriteStream(path.join(logDir, "access.log"), { flags: "a" });
app.use(morgan("combined", { stream: accessLogStream }));

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.static("public"));

app.use("/api/auth", createAuthRoutes(container));
app.use("/api/admin", createAdminRoutes(container));
app.use("/api/pro", createProRoutes(container));
app.use("/api/user", createUserRoutes(container));

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
const dbConnector = container.get<DatabaseConnector>(TYPES.DatabaseConnector);

dbConnector
  .connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });