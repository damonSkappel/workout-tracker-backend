import db from "../database/connection.js";

/**
 * Route params arrive as strings. Anything that is not a positive integer can
 * never match a serial primary key, and would make Postgres throw on the
 * comparison (turning a bad request into a 500), so reject it up front.
 */
export const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * A valid token only says *who* the caller is. It says nothing about which rows
 * they may touch, so every lookup by id has to prove ownership separately.
 *
 * Ownership chains back to a user like this:
 *   workout_templates.user_id
 *   template_exercises -> workout_templates.user_id
 *   workout_sessions.user_id
 *   sets -> workout_sessions.user_id
 */
export const userOwnsTemplate = async (templateId, userId) => {
  const { rows } = await db.query(
    "SELECT 1 FROM workout_templates WHERE id = $1 AND user_id = $2",
    [templateId, userId],
  );
  return rows.length > 0;
};

export const userOwnsSession = async (sessionId, userId) => {
  const { rows } = await db.query(
    "SELECT 1 FROM workout_sessions WHERE id = $1 AND user_id = $2",
    [sessionId, userId],
  );
  return rows.length > 0;
};
