import rateLimit from "express-rate-limit";
import { getRateLimitStore } from "../config/rate-limit-store";

const withStore = <T extends Parameters<typeof rateLimit>[0]>(options: T): T => {
  const store = getRateLimitStore();
  return store ? { ...options, store } : options;
};

export const loginLimiter = rateLimit(
  withStore({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many login attempts, please try again after 15 minutes" },
  })
);

export const registerLimiter = rateLimit(
  withStore({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many registration attempts, please try again later" },
  })
);

export const refreshLimiter = rateLimit(
  withStore({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many token refresh attempts, please try again later" },
  })
);

export const passwordResetLimiter = rateLimit(
  withStore({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many password reset requests, please try again later" },
  })
);

export const emailVerificationLimiter = rateLimit(
  withStore({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Too many verification requests, please try again later",
    },
  })
);

export const uploadLimiter = rateLimit(
  withStore({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many upload attempts, please try again later" },
  })
);
