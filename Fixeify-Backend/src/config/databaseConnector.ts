import mongoose from "mongoose";
import { injectable } from "inversify";

declare const process: {
  env: {
    MONGO_URI?: string;
    NODE_ENV?: string;
    [key: string]: string | undefined;
  };
  on: (event: string, listener: () => void) => void;
  exit: (code: number) => void;
};

declare const console: {
  log: (message: string) => void;
  error: (message: string, error?: unknown) => void;
};

@injectable()
class DatabaseConnector {
  async connect(): Promise<void> {
    try {
      const uri = process.env.MONGO_URI;
      if (!uri) {
        throw new Error("MONGO_URI is not set");
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
      conn.on("connected", () => console.log("MongoDB connected to Atlas"));
      conn.on("error", (err) => console.error("MongoDB connection error:", err));

      const graceful = async (signal: string) => {
        try {
          await mongoose.connection.close();
          console.log(`MongoDB connection closed on ${signal}`);
        } catch (e) {
          console.error("Error closing MongoDB connection:", e);
        } finally {
          process.exit(0);
        }
      };

      process.on("SIGINT", () => graceful("SIGINT"));
      process.on("SIGTERM", () => graceful("SIGTERM"));
    } catch (error) {
      console.error("Database Connection Failed", error);
      process.exit(1);
    }
  }
}

export default DatabaseConnector;