import { Schema, model } from "mongoose";
import type { ISettings } from "../types/settings.types";
import { PAYMENT_MODES } from "../types/settings.types";

const settingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      immutable: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    paymentMode: {
      type: String,
      enum: PAYMENT_MODES,
      default: "test",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Settings = model<ISettings>("Settings", settingsSchema);
