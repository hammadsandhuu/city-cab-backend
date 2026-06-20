import { Router, type IRouter } from "express";
import newsletterController from "../controllers/newsletter.controller";
import { protectAdmin } from "../middleware/auth";
import { csrfProtection } from "../middleware/csrf";
import { validateRequest } from "../middleware/validate";
import { bulkDeleteSchema, subscribeSchema } from "../validators/newsletter.validator";

const publicNewsletterRoutes: IRouter = Router();

publicNewsletterRoutes.post(
  "/",
  validateRequest(subscribeSchema),
  newsletterController.subscribe
);

const adminNewsletterRoutes: IRouter = Router();

adminNewsletterRoutes.use(protectAdmin);
adminNewsletterRoutes.use(csrfProtection);

adminNewsletterRoutes.get("/", newsletterController.getAll);
adminNewsletterRoutes.delete(
  "/bulk",
  validateRequest(bulkDeleteSchema),
  newsletterController.bulkDelete
);
adminNewsletterRoutes.delete("/:id", newsletterController.deleteOne);

export { publicNewsletterRoutes, adminNewsletterRoutes };
