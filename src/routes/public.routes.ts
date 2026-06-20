import { Router, type IRouter } from "express";
import uploadRoutes from "./upload.routes";
import userAuthRoutes from "./user-auth.routes";
import { publicNewsletterRoutes } from "./newsletter.routes";
import { publicSettingsRoutes } from "./settings.routes";

const publicRoutes: IRouter = Router();

publicRoutes.use("/settings/public", publicSettingsRoutes);
publicRoutes.use("/newsletter", publicNewsletterRoutes);
publicRoutes.use("/auth", userAuthRoutes);
publicRoutes.use("/upload", uploadRoutes);

export default publicRoutes;
