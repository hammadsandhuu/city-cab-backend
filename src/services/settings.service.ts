import { Settings } from "../models/Settings";
import { AppError } from "../errors/AppError";

const GLOBAL_SETTINGS_KEY = "global";

class SettingsService {
  private async getOrCreateSettings() {
    let settings = await Settings.findOne({ key: GLOBAL_SETTINGS_KEY });

    if (!settings) {
      settings = await Settings.create({
        key: GLOBAL_SETTINGS_KEY,
        maintenanceMode: false,
        comingSoonMode: false,
        paymentMode: "test",
        minBookingMinutes: 0,
        stopFee: 0,
        cardProcessingFee: 0,
        airportPickup: 0,
        trainPickup: 0,
        meetAndGreet: 0,
        returnMeetAndGreet: 0,
        waitingTimePricePerMinute: 0,
        waitingTimePricePerHour: 0,
      });
    }

    return settings;
  }

  async getSettings() {
    const settings = await this.getOrCreateSettings();
    return settings;
  }

  async getPublicSettings() {
    const settings = await this.getOrCreateSettings();

    return {
      maintenanceMode: settings.maintenanceMode,
      comingSoonMode: settings.comingSoonMode ?? false,
      minBookingMinutes: settings.minBookingMinutes ?? 120,
      stopFee: settings.stopFee ?? 0,
      cardProcessingFee: settings.cardProcessingFee ?? 0,
      airportPickup: settings.airportPickup ?? 0,
      trainPickup: settings.trainPickup ?? 0,
      meetAndGreet: settings.meetAndGreet ?? 0,
      returnMeetAndGreet: settings.returnMeetAndGreet ?? 0,
      waitingTimePricePerMinute: settings.waitingTimePricePerMinute ?? 0,
      waitingTimePricePerHour: settings.waitingTimePricePerHour ?? 0,
    };
  }

  async updateSettings(data: any, adminId: string) {
    const settings = await Settings.findOneAndUpdate(
      { key: GLOBAL_SETTINGS_KEY },
      { ...data, updatedBy: adminId },
      { new: true }
    );

    if (!settings) {
      throw new AppError("Failed to update settings", 500);
    }

    return settings;
  }
}

export default new SettingsService();
