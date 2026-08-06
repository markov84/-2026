import rateLimit from "express-rate-limit";

export function createAuthLimiter(options = {}) {
  return rateLimit({
    windowMs: options.windowMs ?? 15 * 60 * 1000,
    max: options.max ?? 8,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      message: "Too many login attempts. Please try again later."
    },
    ...options
  });
}
