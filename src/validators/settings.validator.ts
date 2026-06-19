import Joi from "joi";
import { PAYMENT_MODES } from "../types/settings.types";

export const updateSettingsSchema = Joi.object({
  maintenanceMode: Joi.boolean().required().messages({
    "any.required": "Maintenance mode is required",
    "boolean.base": "Maintenance mode must be true or false",
  }),
  paymentMode: Joi.string()
    .valid(...PAYMENT_MODES)
    .required()
    .messages({
      "any.only": "Payment mode must be test or live",
      "any.required": "Payment mode is required",
    }),
});
