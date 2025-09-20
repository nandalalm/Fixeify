import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { Server } from "http";
import DatabaseConnector from "./config/databaseConnector";
import RedisConnector from "./config/redisConnector";
import createAuthRoutes from "./routes/authRoutes";
import createAdminRoutes from "./routes/adminRoutes";
import createProRoutes from "./routes/proRoute";
import createUserRoutes from "./routes/userRoutes";
import createStripeRoutes from "./routes/stripeRoutes";
import createChatRoutes from "./routes/chatRoutes";
import createNotificationRoutes from "./routes/notificationRoutes";
import createRatingReviewRoutes from "./routes/ratingReviewRoutes";
import createTicketRoutes from "./routes/ticketRoutes";
import { Container } from "inversify";
import TransactionModel from "./models/transactionModel";
import { TYPES } from "./types";
import { AuthController } from "./controllers/authController";
import { AdminController } from "./controllers/adminController";
import { ProController } from "./controllers/proController";
import { UserController } from "./controllers/userController";
import { ChatController } from "./controllers/chatController";
import { NotificationController } from "./controllers/notificationController";
import { RatingReviewController } from "./controllers/ratingReviewController";
import { TicketController } from "./controllers/ticketController";
import { AuthService } from "./services/AuthService";
import { IAuthService } from "./services/IAuthService";
import { AdminService } from "./services/AdminService";
import { ProService } from "./services/ProService";
import { UserService } from "./services/UserService";
import { ChatService } from "./services/ChatService";
import { NotificationService } from "./services/NotificationService";
import { RatingReviewService } from "./services/RatingReviewService";
import { ITicketService } from "./services/ITicketService";
import { TicketService } from "./services/ticketService";
import { IUserRepository } from "./repositories/IUserRepository";
import { IAdminRepository } from "./repositories/IAdminRepository";
import { IProRepository } from "./repositories/IProRepository";
import { ICategoryRepository } from "./repositories/ICategoryRepository";
import { IBookingRepository } from "./repositories/IBookingRepository";
import { IQuotaRepository } from "./repositories/IQuotaRepository";
import { IWalletRepository } from "./repositories/IWalletRepository";
import { IWithdrawalRequestRepository } from "./repositories/IWithdrawalRequestRepository";
import { IChatRepository } from "./repositories/IChatRepository";
import { INotificationRepository } from "./repositories/INotificationRepository";
import { IRatingReviewRepository } from "./repositories/IRatingReviewRepository";
import { ITransactionRepository } from "./repositories/ITransactionRepository";
import { ITicketRepository } from "./repositories/ITicketRepository";
import { MongoUserRepository } from "./repositories/UserRepository";
import { MongoAdminRepository } from "./repositories/AdminRepository";
import { MongoProRepository } from "./repositories/ProRepository";
import { MongoCategoryRepository } from "./repositories/CategoryRepository";
import { MongoBookingRepository } from "./repositories/BookingRepository";
import { MongoQuotaRepository } from "./repositories/QuotaRepository";
import { MongoWalletRepository } from "./repositories/WalletRepository";
import { MongoWithdrawalRequestRepository } from "./repositories/WithdrawalRequestRepository";
import { MongoChatRepository } from "./repositories/ChatRepository";
import { MongoNotificationRepository } from "./repositories/NotificationRepository";
import { MongoRatingReviewRepository } from "./repositories/ratingReviewRepository";
import { MongoTransactionRepository } from "./repositories/TransactionRepository";
import { MongoTicketRepository } from "./repositories/ticketRepository";
import { ChatGateway } from "./chatGateway";
import { errorMiddleware } from "./middleware/errorMiddleware";
import "./models/notificationModel";
import "./models/chatModel";
import "./models/messageModel";
import { initSlotReleaseWorker, resyncSlotReleaseJobs } from "./services/queue/SlotReleaseQueue";

dotenv.config();

const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const container = new Container();
container.bind<DatabaseConnector>(TYPES.DatabaseConnector).to(DatabaseConnector).inSingletonScope();
container.bind<RedisConnector>(TYPES.RedisConnector).to(RedisConnector).inSingletonScope();
container.bind<IUserRepository>(TYPES.IUserRepository).to(MongoUserRepository).inSingletonScope();
container.bind<IAdminRepository>(TYPES.IAdminRepository).to(MongoAdminRepository).inSingletonScope();
container.bind<IProRepository>(TYPES.IProRepository).to(MongoProRepository).inSingletonScope();
container.bind<ICategoryRepository>(TYPES.ICategoryRepository).to(MongoCategoryRepository).inSingletonScope();
container.bind<IBookingRepository>(TYPES.IBookingRepository).to(MongoBookingRepository).inSingletonScope();
container.bind<IQuotaRepository>(TYPES.IQuotaRepository).to(MongoQuotaRepository).inSingletonScope();
container.bind<IWalletRepository>(TYPES.IWalletRepository).to(MongoWalletRepository).inSingletonScope();
container.bind<IWithdrawalRequestRepository>(TYPES.IWithdrawalRequestRepository).to(MongoWithdrawalRequestRepository).inSingletonScope();
container.bind<IChatRepository>(TYPES.IChatRepository).to(MongoChatRepository).inSingletonScope();
container.bind<INotificationRepository>(TYPES.INotificationRepository).to(MongoNotificationRepository).inSingletonScope();
container.bind<IRatingReviewRepository>(TYPES.IRatingReviewRepository).to(MongoRatingReviewRepository).inSingletonScope();
container.bind<ITransactionRepository>(TYPES.ITransactionRepository).to(MongoTransactionRepository).inSingletonScope();
container.bind<ITicketRepository>(TYPES.ITicketRepository).to(MongoTicketRepository).inSingletonScope();
container.bind<IAuthService>(TYPES.IAuthService).to(AuthService).inSingletonScope();
container.bind<AdminService>(TYPES.IAdminService).to(AdminService).inSingletonScope();
container.bind<ProService>(TYPES.IProService).to(ProService).inSingletonScope();
container.bind<UserService>(TYPES.IUserService).to(UserService).inSingletonScope();
container.bind<ChatService>(TYPES.IChatService).to(ChatService).inSingletonScope();
container.bind<NotificationService>(TYPES.INotificationService).to(NotificationService).inSingletonScope();
container.bind<RatingReviewService>(TYPES.IRatingReviewService).to(RatingReviewService).inSingletonScope();
container.bind<ITicketService>(TYPES.ITicketService).to(TicketService).inSingletonScope();
container.bind<AuthController>(TYPES.AuthController).to(AuthController).inSingletonScope();
container.bind<AdminController>(TYPES.AdminController).to(AdminController).inSingletonScope();
container.bind<ProController>(TYPES.ProController).to(ProController).inSingletonScope();
container.bind<UserController>(TYPES.UserController).to(UserController).inSingletonScope();
container.bind<ChatController>(TYPES.ChatController).to(ChatController).inSingletonScope();
container.bind<NotificationController>(TYPES.NotificationController).to(NotificationController).inSingletonScope();
container.bind<RatingReviewController>(TYPES.RatingReviewController).to(RatingReviewController).inSingletonScope();
container.bind<TicketController>(TYPES.TicketController).to(TicketController).inSingletonScope();
container.bind<ChatGateway>(TYPES.ChatGateway).to(ChatGateway).inSingletonScope();

const app = express();
const server = new Server(app);

const accessLogStream = fs.createWriteStream(path.join(logDir, "access.log"), { flags: "a" });
app.use(morgan("combined", { stream: accessLogStream }));

if (!process.env.FRONTEND_URL && !process.env.FRONTEND_URLS) {
  throw new Error("No Frontend URL(s)");
}

const allowedOrigins = (process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",").map((s) => s.trim()).filter(Boolean)
  : [process.env.FRONTEND_URL!]);

app.use(
  cors({
    credentials: true,
    origin: allowedOrigins,
  })
);
app.use(cookieParser());
app.use(express.static("public"));

app.use("/api/auth", express.json(), createAuthRoutes(container));
app.use("/api/admin", express.json(), createAdminRoutes(container));
app.use("/api/pro", express.json(), createProRoutes(container));
app.use("/api/user", express.json(), createUserRoutes(container));
app.use("/api/stripe", createStripeRoutes(container));
app.use("/api/chat", express.json(), createChatRoutes(container));
app.use("/api/notifications", express.json(), createNotificationRoutes(container));
app.use("/api/rating-reviews", express.json(), createRatingReviewRoutes(container));
app.use("/api/tickets", express.json(), createTicketRoutes(container));

app.use(errorMiddleware);

const chatGateway = container.get<ChatGateway>(TYPES.ChatGateway);
chatGateway.init(server);

const PORT = process.env.PORT || 5000;
const dbConnector = container.get<DatabaseConnector>(TYPES.DatabaseConnector);
const redisConnector = container.get<RedisConnector>(TYPES.RedisConnector);

const connectServices = async (): Promise<void> => {
  try {
    await dbConnector.connect();
    await redisConnector.connect();
    
    try {
      const pipeline = [
        {
          $match: { bookingId: { $exists: true } }
        },
        {
          $group: {
            _id: {
              bookingId: "$bookingId",
              type: "$type", 
              proId: "$proId",
              amount: "$amount",
              adminId: "$adminId"
            },
            docs: { $push: "$$ROOT" },
            count: { $sum: 1 }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ];
      
      const duplicates = await TransactionModel.aggregate(pipeline);
      let removedCount = 0;
      
      for (const duplicate of duplicates) {
        const docsToRemove = duplicate.docs.slice(1);
        for (const doc of docsToRemove) {
          await TransactionModel.deleteOne({ _id: doc._id });
          removedCount++;
        }
      }
    
      
      await TransactionModel.syncIndexes();
    } catch (err) {
      console.error("Failed to sync transaction indexes:", err);
    }
    
    await initSlotReleaseWorker();
    await resyncSlotReleaseJobs();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to services:", err);
    process.exit(1);
  }
};

connectServices();