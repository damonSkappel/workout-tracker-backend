import db from "../database/connection.js";
import { parseId } from "../services/ownership.js";

const setController = {
  updateSet: async (req, res) => {
    const set_id = parseId(req.params.id);
    const user_id = req.user.userId;
    const { weight, reps, completed } = req.body;

    if (!set_id) {
      return res.status(400).json({ error: "Invalid set id." });
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
        [weight, reps, completed, set_id, user_id],
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
