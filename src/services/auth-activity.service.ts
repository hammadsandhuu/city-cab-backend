import { UAParser } from "ua-parser-js";
import { Types } from "mongoose";
import { Activity } from "../models/Activity";
import type { AuthAuditContext } from "../types/auth.types";
import type { AccountUserType, ActivityStatus, ActivityType } from "../types/account-auth";
import logger from "../utils/logger";

class AuthActivityService {
  async log(
    accountId: string,
    userType: AccountUserType,
    audit: AuthAuditContext,
    type: ActivityType,
    status: ActivityStatus = "success"
  ): Promise<void> {
    const { ip, userAgent } = audit;

    try {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      await Activity.create({
        user: new Types.ObjectId(accountId),
        userType,
        type,
        status,
        ipAddress: ip || "unknown",
        userAgent,
        device: result.device.model || "Desktop",
        browser: result.browser.name,
        os: result.os.name,
      });
    } catch (err) {
      logger.error("Activity logging failed", { err, accountId, userType, type });
    }
  }

  async getRecent(accountId: string, userType: AccountUserType, limit = 10) {
    return Activity.find({ user: new Types.ObjectId(accountId), userType })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }
}

export default new AuthActivityService();
