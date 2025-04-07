import mongoose from "mongoose";
import { injectable } from "inversify";

@injectable()
class DatabaseConnector {
  async connect(): Promise<void> {
    try {
      await mongoose.connect(process.env.MONGO_URI!);
      console.log("MongoDB Connected");
    } catch (error) {
      console.error("Database Connection Failed", error);
      process.exit(1);
    }
  }
}

export default DatabaseConnector;