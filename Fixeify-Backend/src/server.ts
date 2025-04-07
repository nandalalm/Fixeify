
import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import DatabaseConnector from "./config/DatabaseConnector";
import createAuthRoutes from "./routes/authRoutes";
import createUserRoutes from "./routes/userRoutes";
import { Container } from "inversify";
import { TYPES } from "./types";
import { AuthController } from "./controllers/AuthController";
import { AuthService } from "./services/AuthService";
import { IUserRepository } from "./repositories/IUserRepository";
import { IAdminRepository } from "./repositories/IAdminRepository";
import { MongoUserRepository } from "./repositories/MongoUserRepository";
import { MongoAdminRepository } from "./repositories/MongoAdminRepository";

dotenv.config();

const container = new Container();
container.bind<DatabaseConnector>(TYPES.DatabaseConnector).to(DatabaseConnector).inSingletonScope();
container.bind<IUserRepository>(TYPES.IUserRepository).to(MongoUserRepository).inSingletonScope();
container.bind<IAdminRepository>(TYPES.IAdminRepository).to(MongoAdminRepository).inSingletonScope();
container.bind<AuthService>(TYPES.AuthService).to(AuthService).inSingletonScope();
container.bind<AuthController>(TYPES.AuthController).to(AuthController).inSingletonScope();

const app = express();

app.use(cors({ credentials: true, origin: "http://localhost:5173" }));
app.use(cookieParser());
app.use(express.json());
app.use(express.static("public"));

app.use("/api/auth", createAuthRoutes(container));
app.use("/api/users", createUserRoutes(container));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const dbConnector = container.get<DatabaseConnector>(TYPES.DatabaseConnector);
dbConnector.connect().then(() => {
  app.listen(5000, () => console.log("Server running on port 5000"));
});