import rateLimit from "express-rate-limit";

/**
 * General API rate limiter
 * Generous cap so high-frequency gameplay clicks do not exhaust the API quota.
 * Auth and metadata saves still have stricter route-level limiters below.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000,
  message: {
    success: false,
    error: { message: "Too many requests, please try again later." },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter (stricter)
 * 10 login/register attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: {
      message: "Too many auth attempts, please try again after 15 minutes.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Game save rate limiter
 * 30 saves per minute per IP (debounce is 3s, so ~20/min expected)
 */
export const saveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: { message: "Saving too frequently, please wait." },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
