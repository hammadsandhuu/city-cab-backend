import { UAParser } from "ua-parser-js";
import { Types } from "mongoose";
import { Session } from "../models/Session";
import type { ISession } from "../types/session.types";
import { JwtUtil } from "../utils/jwt";
import type { TokenPayload } from "../types/auth.types";
import { AppError } from "../errors/AppError";
import { env } from "../config/env";
import { getRefreshExpiryDate } from "../utils/duration";
import type { AuthAuditContext } from "../types/auth.types";
import type { AccountUserType } from "../types/account-auth";

class AuthSessionService {
  async create(
    userId: string,
    userType: AccountUserType,
    refreshToken: string,
    audit: AuthAuditContext
  ): Promise<ISession> {
    const { ip, userAgent } = audit;

    await this.enforceMaxSessions(userId, userType);

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return Session.create({
      user: new Types.ObjectId(userId),
      userType,
      refreshToken: JwtUtil.hashToken(refreshToken),
      ipAddress: ip || "unknown",
      userAgent,
      device: result.device.model || "Desktop",
      browser: result.browser.name,
      os: result.os.name,
      expiresAt: getRefreshExpiryDate(),
    });
  }

  async rotate(
    refreshToken: string,
    userType: AccountUserType,
    buildPayload: (userId: string) => Promise<TokenPayload | null>
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = JwtUtil.verifyRefreshToken(refreshToken);

    if (decoded.type !== userType) {
      throw new AppError("Invalid or compromised refresh token", 401);
    }

    const tokenPayload = await buildPayload(decoded.id);
    if (!tokenPayload) {
      await Session.updateMany(
        { user: new Types.ObjectId(decoded.id), userType },
        { isValid: false }
      );
      throw new AppError("Invalid or compromised refresh token", 401);
    }

    const newRefreshToken = JwtUtil.generateRefreshToken(tokenPayload);
    const newHashedRefresh = JwtUtil.hashToken(newRefreshToken);
    const hashedToken = JwtUtil.hashToken(refreshToken);

    const session = await Session.findOneAndUpdate(
      {
        refreshToken: hashedToken,
        isValid: true,
        expiresAt: { $gt: new Date() },
        userType,
        user: new Types.ObjectId(decoded.id),
      },
      { $set: { refreshToken: newHashedRefresh } },
      { new: true }
    );

    if (!session) {
      await Session.updateMany(
        { user: new Types.ObjectId(decoded.id), userType },
        { isValid: false }
      );
      throw new AppError("Invalid or compromised refresh token", 401);
    }

    const accessToken = JwtUtil.generateAccessToken(tokenPayload);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async invalidate(refreshToken: string, userId: string, userType: AccountUserType): Promise<void> {
    const hashedToken = JwtUtil.hashToken(refreshToken);
    await Session.findOneAndUpdate(
      { refreshToken: hashedToken, user: new Types.ObjectId(userId), userType },
      { isValid: false }
    );
  }

  async invalidateAll(userId: string, userType: AccountUserType): Promise<void> {
    await Session.updateMany(
      { user: new Types.ObjectId(userId), userType },
      { isValid: false }
    );
  }

  async listForUser(userId: string, userType: AccountUserType) {
    return Session.find({
      user: new Types.ObjectId(userId),
      userType,
      isValid: true,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select("-refreshToken")
      .lean();
  }

  async revokeById(
    sessionId: string,
    userId: string,
    userType: AccountUserType
  ): Promise<boolean> {
    const result = await Session.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        user: new Types.ObjectId(userId),
        userType,
      },
      { isValid: false }
    );
    return Boolean(result);
  }

  private async enforceMaxSessions(userId: string, userType: AccountUserType): Promise<void> {
    const max = env.MAX_SESSIONS_PER_USER;
    const sessions = await Session.find({
      user: new Types.ObjectId(userId),
      userType,
      isValid: true,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .select("_id");

    const excess = sessions.length - max + 1;
    if (excess <= 0) return;

    const toRevoke = sessions.slice(0, excess).map((s) => s._id);
    await Session.updateMany({ _id: { $in: toRevoke } }, { isValid: false });
  }
}

export default new AuthSessionService();
