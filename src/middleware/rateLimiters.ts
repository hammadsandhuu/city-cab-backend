import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { getRateLimitStore } from "@/infrastructure/redis/rate-limit-store";

const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

const noopLimiter: RequestHandler = (_req, _res, next) => next();

const withStore = <T extends Parameters<typeof rateLimit>[0]>(options: T): T => {
  const store = getRateLimitStore();
  return store ? { ...options, store } : options;
};

const createLimiter = (options: Parameters<typeof rateLimit>[0]): RequestHandler => {
  if (isTestEnv) return noopLimiter;
  return rateLimit(withStore(options)) as RequestHandler;
};

export const loginLimiter: RequestHandler = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts, please try again after 15 minutes" },
});

export const registerLimiter: RequestHandler = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many registration attempts, please try again later" },
});

export const refreshLimiter: RequestHandler = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many token refresh attempts, please try again later" },
});

export const passwordResetLimiter: RequestHandler = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many password reset requests, please try again later" },
});

export const emailVerificationLimiter: RequestHandler = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many verification requests, please try again later",
  },
});

export const uploadLimiter: RequestHandler = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many upload attempts, please try again later" },
});

export const newsletterLimiter: RequestHandler = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many newsletter subscription attempts, please try again later",
  },
});
