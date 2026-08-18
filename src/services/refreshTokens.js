import crypto from "crypto";
import db from "../database/connection.js";

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const TTL_DAYS = num(process.env.REFRESH_TOKEN_TTL_DAYS, 60);
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

// Tokens are opaque random strings, not JWTs: they carry no claims, so the only
// way to use one is to match a row we still consider live.
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const issueRefreshToken = async (userId) => {
  const token = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, hashToken(token), expiresAt],
  );

  return token;
};

export const revokeRefreshToken = async (token) => {
  await db.query(
    "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1 AND revoked_at IS NULL",
    [hashToken(token)],
  );
};

export const revokeAllForUser = async (userId) => {
  await db.query(
    "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL",
    [userId],
  );
};

/**
 * Consumes a refresh token and issues a replacement, so each token works
 * exactly once.
 *
 * Returns one of:
 *   { status: "rotated", userId, email, refreshToken }
 *   { status: "invalid" }  - unknown or expired
 *   { status: "reused", userId } - already-consumed token presented again,
 *     which means a copy leaked; every session for that user is revoked.
 */
export const rotateRefreshToken = async (token) => {
  const result = await db.query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.email
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = $1`,
    [hashToken(token)],
  );

  const row = result.rows[0];
  if (!row) return { status: "invalid" };

  // A revoked token being presented again means someone kept a copy. The
  // legitimate holder already rotated past it, so burn every session.
  if (row.revoked_at) {
    await revokeAllForUser(row.user_id);
    return { status: "reused", userId: row.user_id };
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { status: "invalid" };
  }

  await db.query(
    "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1",
    [row.id],
  );

  const refreshToken = await issueRefreshToken(row.user_id);

  return {
    status: "rotated",
    userId: row.user_id,
    email: row.email,
    refreshToken,
  };
};
