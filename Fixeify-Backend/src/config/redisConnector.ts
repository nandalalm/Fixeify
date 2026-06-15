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
      logger.info(MESSAGES.REDIS_ALREADY_CONNECTED);
      return;
    }

    try {
      const url = process.env.REDIS_URL;
      if (!url) {
        logger.warn(MESSAGES.REDIS_URL_NOT_SET_SKIP_CONNECTION);
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
        logger.error(MESSAGES.REDIS_ERROR, err);
      });

      this._client.on("connect", () => {
      });

      this._client.on("ready", () => {
        logger.info(MESSAGES.REDIS_CONNECTED_SUCCESSFULLY);
      });

      this._client.on("end", () => {
      });

      await this._client.connect();
    } catch (error) {
      logger.error(MESSAGES.REDIS_CONNECT_FAILED, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this._client?.isOpen) {
      await this._client.disconnect();
      logger.info(MESSAGES.REDIS_DISCONNECTED);
    }
  }

  getClient(): RedisClientType {
    if (!this._client?.isOpen) {
      throw new Error(MESSAGES.REDIS_CLIENT_NOT_CONNECTED);
    }
    return this._client;
  }

  isConnected(): boolean {
    return this._client?.isOpen || false;
  }
}

export default RedisConnector;
