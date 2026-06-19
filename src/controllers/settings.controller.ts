import { Request, Response } from "express";
import settingsService from "../services/settings.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendSuccess } from "../utils/response";
import { AppError } from "../errors/AppError";

class SettingsController {
  getSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const settings = await settingsService.getSettings();
    return sendSuccess(res, settings.toObject());
  });

  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const settings = await settingsService.updateSettings(
      req.body,
      req.admin._id.toString()
    );

    return sendSuccess(res, settings.toObject(), {
      message: "Settings updated successfully",
    });
  });
}

export default new SettingsController();
