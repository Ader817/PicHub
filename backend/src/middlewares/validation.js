import { ZodError } from "zod";

export function handleValidationErrors(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.errors,
    });
  }
  next();
}
