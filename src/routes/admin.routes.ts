import { Router, type IRouter } from "express";
import adminAuthRoutes from "./admin-auth.routes";
import { adminNewsletterRoutes } from "./newsletter.routes";
import { adminSettingsRoutes } from "./settings.routes";

const adminRoutes: IRouter = Router();

adminRoutes.use("/auth", adminAuthRoutes);
adminRoutes.use("/settings", adminSettingsRoutes);
adminRoutes.use("/newsletters", adminNewsletterRoutes);

export default adminRoutes;
