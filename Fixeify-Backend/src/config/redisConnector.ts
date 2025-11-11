import { createClient, RedisClientType } from "redis";
import { injectable } from "inversify";
import logger from "./logger";
import { MESSAGES } from "../constants/messages";

@injectable()
export class RedisConnector {
  private static _instance: RedisConnector;
  private _client: RedisClientType | null = null;

  constructor() {
    if (RedisConnector._instance) {
      return RedisConnector._instance;
    }
    RedisConnector._instance = this;
  }

  async connect(): Promise<void> {
    if (this._client?.isOpen) {
      logger.info("Redis already connected");
      return;
    }

    try {
      const url = process.env.REDIS_URL;
      if (!url) {
        logger.warn("REDIS_URL not set. Skipping Redis connection (features depending on Redis will be disabled). Set REDIS_URL in Fixeify-Backend/.env to enable Redis.");
        return; 
      }

      this._client = createClient({
        url,
        socket: {
          keepAlive: 10000,
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
        },
      });

      this._client.on("error", (err) => {
        logger.error(MESSAGES.REDIS_ERROR + ":", err);
      });

      this._client.on("connect", () => {
      });

      this._client.on("ready", () => {
        logger.info("Redis connected successfully");
      });

      this._client.on("end", () => {
      });

      await this._client.connect();
    } catch (error) {
      logger.error(MESSAGES.REDIS_CONNECT_FAILED + ":", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this._client?.isOpen) {
      await this._client.disconnect();
      logger.info("Redis disconnected");
    }
  }

  getClient(): RedisClientType {
    if (!this._client?.isOpen) {
      throw new Error("Redis client is not connected. Call connect() first.");
    }
    return this._client;
  }

  isConnected(): boolean {
    return this._client?.isOpen || false;
  }
}

export default RedisConnector;
