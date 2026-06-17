import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import authService from "../services/auth.service";
import userAuthService from "../services/userAuth.service";
import { JwtUtil } from "../utils/jwt";
import { rejectStaleToken, verifyAccessTokenAccount } from "../utils/auth-account";
import type { AccountUserType } from "../types/account-auth";

const UNAUTHORIZED = "Not authorized to access this route";

const readToken = (req: Request, type: AccountUserType): string | undefined => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return type === "admin" ? req.cookies.accessToken : req.cookies.userAccessToken;
};

const ensureAccountType = (decoded: { type: string }, type: AccountUserType) => {
  if (decoded.type !== type) {
    throw new AppError(UNAUTHORIZED, 401);
  }
};

const loadSession = async (req: Request, type: AccountUserType) => {
  const token = readToken(req, type);
  if (!token) {
    throw new AppError(UNAUTHORIZED, 401);
  }

  const decoded = JwtUtil.verifyAccessToken(token);
  ensureAccountType(decoded, type);

  if (type === "admin") {
    const admin = await authService.findAdminById(decoded.id);
    if (!admin) {
      throw new AppError("User no longer exists", 401);
    }

    rejectStaleToken(decoded, admin.passwordChangedAt);
    req.admin = admin;
    return;
  }

  const user = await userAuthService.findUserById(decoded.id);
  if (!user) {
    throw new AppError("User no longer exists", 401);
  }

  rejectStaleToken(decoded, user.passwordChangedAt);

  if (user.status !== "active") {
    throw new AppError("Account is not active", 403);
  }

  req.user = user;
};

const guard =
  (type: AccountUserType) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await loadSession(req, type);
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      next(new AppError("Invalid or expired token", 401));
    }
  };

const readAnyAccessToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return req.cookies.userAccessToken || req.cookies.accessToken;
};

export const protectAuthenticated = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = readAnyAccessToken(req);
    if (!token) {
      throw new AppError(UNAUTHORIZED, 401);
    }

    const account = await verifyAccessTokenAccount(token);

    if (account.type === "admin") {
      const admin = await authService.findAdminById(account.userId);
      if (!admin) {
        throw new AppError("User no longer exists", 401);
      }
      req.admin = admin;
      return next();
    }

    const user = await userAuthService.findUserById(account.userId);
    if (!user) {
      throw new AppError("User no longer exists", 401);
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError("Invalid or expired token", 401));
  }
};

export const protectAdmin = guard("admin");
export const protectUser = guard("user");
