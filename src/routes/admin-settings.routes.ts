import { Router, type IRouter } from "express";
import settingsController from "../controllers/settings.controller";
import { protectAdmin } from "../middleware/auth";
import { validateRequest } from "../middleware/validate";
import { csrfProtection } from "../middleware/csrf";
import { updateSettingsSchema } from "../validators/settings.validator";

const router: IRouter = Router();

router.use(protectAdmin);
router.use(csrfProtection);

router.get("/", settingsController.getSettings);
router.post("/", validateRequest(updateSettingsSchema), settingsController.updateSettings);

export default router;
