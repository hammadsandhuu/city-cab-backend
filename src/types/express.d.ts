import type { IAdmin } from "./admin.types";
import type { IUser } from "./user.types";

declare global {
  namespace Express {
    interface Request {
      admin?: IAdmin;
      user?: IUser;
      sessionId?: string;
    }
  }
}
