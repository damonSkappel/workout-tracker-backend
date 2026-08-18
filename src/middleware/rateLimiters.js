import rateLimit from "express-rate-limit";

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const WINDOW_MS = num(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);

const shared = {
  windowMs: WINDOW_MS,
  standardHeaders: "draft-7", // RateLimit-* response headers
  legacyHeaders: false,
};

/**
 * Caps password guessing against a single IP. Successful logins are not
 * counted, so an active user is never locked out by their own normal use --
 * only a run of failures burns through the budget.
 */
export const loginLimiter = rateLimit({
  ...shared,
  limit: num(process.env.LOGIN_RATE_LIMIT_MAX, 10),
  skipSuccessfulRequests: true,
  message: {
    error: "Too many login attempts. Please wait a few minutes and try again.",
  },
});

/**
 * Refreshes are legitimate background traffic, so this is generous. It exists
 * only to bound someone hammering the endpoint with stolen-token guesses.
 */
export const refreshLimiter = rateLimit({
  ...shared,
  limit: num(process.env.REFRESH_RATE_LIMIT_MAX, 60),
  message: {
    error: "Too many refresh attempts. Please try again later.",
  },
});

/** Stops one IP from mass-creating accounts. */
export const registerLimiter = rateLimit({
  ...shared,
  limit: num(process.env.REGISTER_RATE_LIMIT_MAX, 5),
  message: {
    error: "Too many accounts created from here. Please try again later.",
  },
});
