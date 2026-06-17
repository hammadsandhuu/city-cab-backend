import winston from "winston";
import { env } from "../config/env";

const isCloudHost = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RENDER);
const transports: winston.transport[] = [];

if (isCloudHost || env.NODE_ENV === "production") {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
    })
  );
} else {
  transports.push(
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "city-airport-taxis-backend-api" },
  transports,
});

export default logger;
