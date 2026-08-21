import db from "../database/connection.js";
import { parseId } from "../services/ownership.js";

// Generous bounds. These are not opinions about your training -- they exist to
// reject a fat-fingered "1350" or a stray letter, not to cap anyone's lifts.
const MAX_WEIGHT = 10000;
const MAX_REPS = 1000;

/** Weight may be fractional and 0 is valid (bodyweight). */
const parseWeight = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const weight = Number(value);
  if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT) return null;
  return weight;
};

/** Reps are whole and a completed set has at least one. */
const parseReps = (value) => {
  const reps = Number(value);
  if (!Number.isInteger(reps) || reps < 1 || reps > MAX_REPS) return null;
  return reps;
};

const setController = {
  updateSet: async (req, res) => {
    const set_id = parseId(req.params.id);
    const user_id = req.user.userId;
    const { weight, reps, completed } = req.body;

    if (!set_id) {
      return res.status(400).json({ error: "Invalid set id." });
    }

    // The app validates these too, but the API is reachable without it, and
    // "weight = abc" would otherwise be stored or blow up as a 500.
    const parsedWeight = parseWeight(weight);
    if (parsedWeight === null) {
      return res.status(400).json({
        error: `Weight must be a number between 0 and ${MAX_WEIGHT}.`,
      });
    }

    const parsedReps = parseReps(reps);
    if (parsedReps === null) {
      return res.status(400).json({
        error: `Reps must be a whole number between 1 and ${MAX_REPS}.`,
      });
    }

    try {
      // A set has no user_id of its own, so ownership is proven through the
      // session it belongs to. Doing it inside the UPDATE means there is no
      // window between checking and writing.
      const result = await db.query(
        `UPDATE sets
            SET weight = $1, reps = $2, completed = $3
          WHERE id = $4
            AND session_id IN (
              SELECT id FROM workout_sessions WHERE user_id = $5
            )
        RETURNING *`,
        [parsedWeight, parsedReps, completed === true, set_id, user_id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Set not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default setController;
