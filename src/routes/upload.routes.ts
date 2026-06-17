import { Router, type IRouter } from "express";
import uploadController from "../controllers/upload.controller";
import { uploadSingle } from "../middleware/upload";
import { csrfProtection } from "../middleware/csrf";
import { protectAuthenticated } from "../middleware/auth";

import { uploadLimiter } from "../middleware/rateLimiters";

const router: IRouter = Router();

router.post(
  "/upload",
  uploadLimiter,
  protectAuthenticated,
  csrfProtection,
  uploadSingle("file"),
  uploadController.uploadImage
);

export default router;
