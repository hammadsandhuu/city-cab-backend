import http from "http";
import mongoose from "mongoose";
import app from "./app";
import connectDB from "./config/database";
import { RedisClient } from "./config/redis";
import { env } from "./config/env";
import { initSocketServer, shutdownSocketServer } from "./socket";
import logger from "./utils/logger";

const PORT = env.PORT || 5000;

let httpServer: http.Server | null = null;
let isShuttingDown = false;

const bootstrap = async (): Promise<void> => {
  await connectDB();
  await RedisClient.connect();

  httpServer = http.createServer(app);
  await initSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`, {
      redisEnabled: env.REDIS_ENABLED,
      socketEnabled: env.SOCKET_ENABLED,
      socketPath: env.SOCKET_PATH,
    });
  });
};

const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);

  try {
    await shutdownSocketServer();
    await RedisClient.disconnect();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info("MongoDB disconnected");
    }

    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      httpServer = null;
    }

    logger.info("Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", { error });
    process.exit(1);
  }
};

bootstrap().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});

process.on("unhandledRejection", (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

process.on("uncaughtException", (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

export default app;
