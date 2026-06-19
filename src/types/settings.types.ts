import type { Document, Types } from "mongoose";

export const PAYMENT_MODES = ["test", "live"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface ISettings extends Document {
  key: string;
  maintenanceMode: boolean;
  paymentMode: PaymentMode;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
