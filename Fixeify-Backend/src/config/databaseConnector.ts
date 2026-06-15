import mongoose from "mongoose";
import { injectable } from "inversify";
import logger from "./logger";
import { MESSAGES } from "../constants/messages";

declare const process: {
  env: {
    MONGO_URI?: string;
    NODE_ENV?: string;
    [key: string]: string | undefined;
  };
  on: (event: string, listener: () => void) => void;
  exit: (code: number) => void;
};

@injectable()
class DatabaseConnector {
  async connect(): Promise<void> {
    try {
      const uri = process.env.MONGO_URI;
      if (!uri) {
        throw new Error(MESSAGES.MONGO_URI_NOT_SET);
      }

      mongoose.set("strictQuery", true);
      if (process.env.NODE_ENV !== "production") {
        mongoose.set("debug", false);
      }

      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
      });

      const conn = mongoose.connection;
      conn.on("connected", () => logger.info(MESSAGES.MONGODB_CONNECTED_TO_ATLAS));
      conn.on("error", (err) => logger.error(MESSAGES.MONGODB_CONNECTION_ERROR, err));

      const graceful = async (signal: string) => {
        try {
          await mongoose.connection.close();
          logger.info(`${MESSAGES.MONGODB_CONNECTION_CLOSED_ON} ${signal}`);
        } catch (e) {
          logger.error(MESSAGES.MONGODB_CLOSE_ERROR, e);
        } finally {
          process.exit(0);
        }
      };

      process.on("SIGINT", () => graceful("SIGINT"));
      process.on("SIGTERM", () => graceful("SIGTERM"));
    } catch (error) {
      logger.error(MESSAGES.DATABASE_CONNECTION_FAILED, error);
      process.exit(1);
    }
  }
}

export default DatabaseConnector;
