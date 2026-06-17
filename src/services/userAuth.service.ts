import crypto from "crypto";
import { User } from "../models/User";
import type { IUser } from "../types/user.types";
import { AppError } from "../errors/AppError";
import emailService from "./email.service";
import { JwtUtil } from "../utils/jwt";
import authSessionService from "./auth-session.service";
import authActivityService from "./auth-activity.service";
import authLockoutService from "./auth-lockout.service";
import { normalizeEmail } from "../utils/email";
import { env } from "../config/env";
import { AuthAuditContext, USER_ACCOUNT_TYPE, toUserTokenPayload } from "../types/auth.types";
import type { ActivityStatus, ActivityType } from "../types/account-auth";

class UserAuthService {
  async findUserById(id: string) {
    return User.findById(id);
  }

  private async issueTokens(user: IUser, audit: AuthAuditContext) {
    const tokenPayload = toUserTokenPayload(user._id.toString());
    const accessToken = JwtUtil.generateAccessToken(tokenPayload);
    const refreshToken = JwtUtil.generateRefreshToken(tokenPayload);
    await authSessionService.create(user._id.toString(), USER_ACCOUNT_TYPE, refreshToken, audit);
    return { accessToken, refreshToken };
  }

  private async setEmailVerificationToken(user: IUser) {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.isVerified = false;
    await user.save();
    return verificationToken;
  }

  async register(data: Record<string, unknown>, audit: AuthAuditContext) {
    const {
      firstName,
      lastName,
      email: rawEmail,
      password,
      phoneNumber,
      phone,
      companyName,
      businessProfile,
    } = data as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phoneNumber?: string;
      phone?: string;
      companyName?: string;
      businessProfile?: string;
    };

    const email = normalizeEmail(rawEmail);

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError("An account with this email already exists", 409);
    }

    let user: IUser;
    try {
      user = await User.create({
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || phone,
        companyName,
        businessProfile,
        password,
        status: "active",
      });
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) {
        throw new AppError("An account with this email already exists", 409);
      }
      throw err;
    }

    if (env.REQUIRE_EMAIL_VERIFICATION) {
      const verificationToken = await this.setEmailVerificationToken(user);
      await emailService.sendEmailVerification(user, verificationToken);
      return { user, accessToken: "", refreshToken: "" };
    }

    user.isVerified = true;
    await user.save();

    const tokens = await this.issueTokens(user, audit);
    await authActivityService.log(user._id.toString(), USER_ACCOUNT_TYPE, audit, "login");

    return { user, ...tokens };
  }

  async verifyEmail(token: string, audit: AuthAuditContext) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError("Verification link is invalid or has expired", 400);
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.status = "active";
    await user.save();

    await authActivityService.log(user._id.toString(), USER_ACCOUNT_TYPE, audit, "email_verified");

    const tokens = await this.issueTokens(user, audit);
    return { user, ...tokens };
  }

  async resendVerificationEmail(data: { email: string }) {
    const { email } = data;

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || user.isVerified) return;

    const verificationToken = await this.setEmailVerificationToken(user);
    await emailService.sendEmailVerification(user, verificationToken);
  }

  async login(data: { email: string; password: string }, audit: AuthAuditContext) {
    const { email, password } = data;

    const user = await User.findOne({ email: normalizeEmail(email) }).select("+password");
    if (!user) throw new AppError("Invalid credentials", 401);

    authLockoutService.assertNotLocked(user);

    if (user.status === "suspended") {
      throw new AppError("Account is suspended", 403);
    }

    if (user.status !== "active") {
      throw new AppError("Account is not active", 403);
    }

    if (env.REQUIRE_EMAIL_VERIFICATION && !user.isVerified) {
      throw new AppError("Please verify your email before logging in", 403);
    }

    if (!(await authLockoutService.verifyPassword(user, password, USER_ACCOUNT_TYPE, audit))) {
      throw new AppError("Invalid credentials", 401);
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = await this.issueTokens(user, audit);
    await authActivityService.log(user._id.toString(), USER_ACCOUNT_TYPE, audit, "login");

    return { user, ...tokens };
  }

  async refreshToken(token: string) {
    return authSessionService.rotate(token, USER_ACCOUNT_TYPE, async (userId) => {
      const user = await User.findById(userId);
      if (!user || user.status !== "active") return null;
      if (env.REQUIRE_EMAIL_VERIFICATION && !user.isVerified) return null;
      return toUserTokenPayload(user._id.toString());
    });
  }

  async logout(refreshToken: string, userId: string) {
    await authSessionService.invalidate(refreshToken, userId, USER_ACCOUNT_TYPE);
  }

  async logoutAllDevices(userId: string) {
    await Promise.all([
      authSessionService.invalidateAll(userId, USER_ACCOUNT_TYPE),
      User.findByIdAndUpdate(userId, { passwordChangedAt: new Date() }),
    ]);
  }

  async changePassword(
    userId: string,
    data: { oldPassword: string; newPassword: string },
    audit: AuthAuditContext
  ) {
    const { oldPassword, newPassword } = data;

    const user = await User.findById(userId).select("+password");
    if (!user || !(await user.comparePassword(oldPassword))) {
      throw new AppError("Current password is incorrect", 401);
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    await authSessionService.invalidateAll(userId, USER_ACCOUNT_TYPE);
    await authActivityService.log(userId, USER_ACCOUNT_TYPE, audit, "password_change");
  }

  async forgotPassword(data: { email: string }, audit: AuthAuditContext) {
    const { email } = data;

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await emailService.sendForgotPasswordEmail(user, resetToken);
    await authActivityService.log(user._id.toString(), USER_ACCOUNT_TYPE, audit, "password_reset_request");
  }

  async resetPassword(data: { token: string; password: string }, audit: AuthAuditContext) {
    const { token, password } = data;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      throw new AppError("Token is invalid or has expired", 400);
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    await authSessionService.invalidateAll(user._id.toString(), USER_ACCOUNT_TYPE);
    await authActivityService.log(user._id.toString(), USER_ACCOUNT_TYPE, audit, "password_reset");
  }

  async updateProfile(userId: string, data: Record<string, unknown>, audit: AuthAuditContext) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const allowed = ["firstName", "lastName", "phoneNumber", "avatar", "companyName", "businessProfile"];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        (user as unknown as Record<string, unknown>)[key] = data[key];
      }
    }

    await user.save();
    await authActivityService.log(userId, USER_ACCOUNT_TYPE, audit, "update_profile");
    return user;
  }

  async getSessions(userId: string) {
    return authSessionService.listForUser(userId, USER_ACCOUNT_TYPE);
  }

  async revokeSession(userId: string, sessionId: string, audit: AuthAuditContext) {
    const revoked = await authSessionService.revokeById(sessionId, userId, USER_ACCOUNT_TYPE);
    if (!revoked) throw new AppError("Session not found", 404);

    await authActivityService.log(userId, USER_ACCOUNT_TYPE, audit, "session_revoked");
  }

  async logActivity(
    userId: string,
    audit: AuthAuditContext,
    type: ActivityType,
    status: ActivityStatus = "success"
  ) {
    return authActivityService.log(userId, USER_ACCOUNT_TYPE, audit, type, status);
  }

  async getActivities(userId: string) {
    return authActivityService.getRecent(userId, USER_ACCOUNT_TYPE);
  }
}

export default new UserAuthService();
