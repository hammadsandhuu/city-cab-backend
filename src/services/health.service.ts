import mongoose from "mongoose";
import { env } from "../config/env";
import { RedisClient } from "../config/redis";
import { getSocketHealthStatus } from "../socket";

export interface MongoHealthStatus {
  status: string;
  connected: boolean;
}

export interface HealthReport {
  success: boolean;
  message: string;
  timestamp: string;
  environment: string;
  database: MongoHealthStatus;
  redis: Awaited<ReturnType<typeof RedisClient.ping>>;
  socket: ReturnType<typeof getSocketHealthStatus>;
}

const getMongoHealthStatus = (): MongoHealthStatus => {
  const readyState = mongoose.connection.readyState;

  const statusMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    status: statusMap[readyState] || "unknown",
    connected: readyState === 1,
  };
};

export const isServiceHealthy = (
  database: MongoHealthStatus,
  redis: Awaited<ReturnType<typeof RedisClient.ping>>,
  socket: ReturnType<typeof getSocketHealthStatus>
): boolean => {
  if (!database.connected) {
    return false;
  }

  if (env.REDIS_ENABLED && !redis.connected) {
    return false;
  }

  if (env.SOCKET_ENABLED && !socket.initialized) {
    return false;
  }

  return true;
};

export const getHealthReport = async (): Promise<HealthReport> => {
  const database = getMongoHealthStatus();
  const redis = await RedisClient.ping();
  const socket = getSocketHealthStatus();
  const success = isServiceHealthy(database, redis, socket);

  return {
    success,
    message: success ? "Server is healthy" : "One or more services are unavailable",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database,
    redis,
    socket,
  };
};

export const getHealthStatusCode = (report: HealthReport, ready = true): number => {
  if (!ready) {
    return 200;
  }

  if (!report.success) {
    return 503;
  }

  return 200;
};
