import { Router, type IRouter } from "express";
import uploadRoutes from "./upload.routes";
import adminAuthRoutes from "./admin-auth.routes";
import adminSettingsRoutes from "./admin-settings.routes";
import userAuthRoutes from "./user-auth.routes";

const router: IRouter = Router();

router.use("/api/admin/auth", adminAuthRoutes);
router.use("/api/admin/settings", adminSettingsRoutes);
router.use("/api/auth", userAuthRoutes);
router.use("/api/upload", uploadRoutes);

export default router;
