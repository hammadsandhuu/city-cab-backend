import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";
import { AppError } from "../errors/AppError";

export const validateRequest = (schema: ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message.replace(/['"]/g, ""))
        .join(", ");
      return next(new AppError(errorMessage, 400));
    }

    req.body = value;
    next();
  };
};
