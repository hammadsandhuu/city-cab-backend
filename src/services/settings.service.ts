import { Settings } from "../models/Settings";
import { AppError } from "../errors/AppError";
import type { PaymentMode } from "../types/settings.types";

const GLOBAL_SETTINGS_KEY = "global";

class SettingsService {
  private async getOrCreateSettings() {
    let settings = await Settings.findOne({ key: GLOBAL_SETTINGS_KEY });

    if (!settings) {
      settings = await Settings.create({
        key: GLOBAL_SETTINGS_KEY,
        maintenanceMode: false,
        paymentMode: "test",
      });
    } else if (!settings.paymentMode) {
      settings.paymentMode = "test";
      await settings.save();
    }

    return settings;
  }

  async getSettings() {
    const settings = await this.getOrCreateSettings();
    return settings;
  }

  async updateSettings(
    data: { maintenanceMode: boolean; paymentMode: PaymentMode },
    adminId: string
  ) {
    const settings = await Settings.findOneAndUpdate(
      { key: GLOBAL_SETTINGS_KEY },
      {
        maintenanceMode: data.maintenanceMode,
        paymentMode: data.paymentMode,
        updatedBy: adminId,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    if (!settings) {
      throw new AppError("Failed to update settings", 500);
    }

    return settings;
  }
}

export default new SettingsService();
