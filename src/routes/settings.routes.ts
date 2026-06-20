import { Router, type IRouter } from "express";
import settingsController from "../controllers/settings.controller";
import { protectAdmin } from "../middleware/auth";
import { csrfProtection } from "../middleware/csrf";
import { validateRequest } from "../middleware/validate";
import { updateSettingsSchema } from "../validators/settings.validator";

const publicSettingsRoutes: IRouter = Router();
publicSettingsRoutes.get("/", settingsController.getPublicSettings);

const adminSettingsRoutes: IRouter = Router();
adminSettingsRoutes.use(protectAdmin);
adminSettingsRoutes.use(csrfProtection);
adminSettingsRoutes.get("/", settingsController.getSettings);
adminSettingsRoutes.post("/",validateRequest(updateSettingsSchema),settingsController.updateSettings);

export { publicSettingsRoutes, adminSettingsRoutes };
