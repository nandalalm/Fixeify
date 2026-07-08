import { Server } from "http";
import { Container } from "inversify";
import DatabaseConnector from "./config/databaseConnector";
import logger from "./config/logger";
import RedisConnector from "./config/redisConnector";
import { initSlotReleaseWorker, resyncSlotReleaseJobs } from "./services/queue/SlotReleaseQueue";
import { TYPES } from "./types";

const bootstrapServer = async (server: Server, container: Container): Promise<void> => {
  const PORT = process.env.PORT || 5000;
  const dbConnector = container.get<DatabaseConnector>(TYPES.DatabaseConnector);
  const redisConnector = container.get<RedisConnector>(TYPES.RedisConnector);

  try {
    await dbConnector.connect();
    await redisConnector.connect();

    await initSlotReleaseWorker();
    await resyncSlotReleaseJobs();

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to connect to services:", err);
    process.exit(1);
  }
};

export default bootstrapServer;
