import db from "../database/connection.js";
import { parseId, userOwnsTemplate } from "../services/ownership.js";

// A workout set count outside this range is almost certainly a typo rather than
// a plan. Kept in sync with the picker on the Add Exercise screen.
const MIN_SETS = 1;
const MAX_SETS = 10;
const DEFAULT_SETS = 3;

/**
 * Returns the set count to store, or null if the caller sent something invalid.
 * Absent is allowed and falls back to the default; present but nonsense is not.
 */
const parseSetCount = (value) => {
  if (value === undefined || value === null || value === "") return DEFAULT_SETS;
  const count = Number(value);
  if (!Number.isInteger(count) || count < MIN_SETS || count > MAX_SETS) return null;
  return count;
};
const templateController = {
  get: async (req, res) => {
    try {
      const result = await db.query(
        "SELECT * FROM workout_templates WHERE user_id = $1",
        [req.user.userId],
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

  post: async (req, res) => {
    const { name } = req.body;
    const trimmedName = name?.trim();

    if (!trimmedName) {
      return res.status(400).json({ error: "Template name is required." });
    }

    try {
      const result = await db.query(
        "INSERT INTO workout_templates (name, user_id) VALUES ($1, $2) RETURNING *",
        [trimmedName, req.user.userId],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

  postExercise: async (req, res) => {
    const exercise_name = req.body?.exercise_name?.trim();
    const template_id = parseId(req.params.id);
    const user_id = req.user.userId;

    if (!template_id) {
      return res.status(400).json({ error: "Invalid template id." });
    }

    if (!exercise_name) {
      return res.status(400).json({ error: "Exercise name is required." });
    }

    // This was previously destructured away and never inserted, so every
    // exercise silently fell back to the column default no matter what the app
    // sent.
    const default_sets = parseSetCount(req.body?.default_sets);
    if (default_sets === null) {
      return res.status(400).json({
        error: `Sets must be a whole number between ${MIN_SETS} and ${MAX_SETS}.`,
      });
    }

    try {
      // Without this, anyone could add exercises to someone else's template.
      if (!(await userOwnsTemplate(template_id, user_id))) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Appended to the end. The client used to send a hardcoded order_index of
      // 1 for everything, which left ORDER BY order_index with nothing to sort
      // by, so exercises came back in whatever order Postgres felt like. The
      // position is decided here rather than by the caller, since only the
      // server knows what is already in the template.
      const result = await db.query(
        `INSERT INTO template_exercises (exercise_name, order_index, default_sets, template_id)
         VALUES (
           $1,
           (SELECT COALESCE(MAX(order_index), 0) + 1
              FROM template_exercises WHERE template_id = $3),
           $2,
           $3
         )
         RETURNING *`,
        [exercise_name, default_sets, template_id],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  putExercise: async (req, res) => {
    const template_id = parseId(req.params.id);
    const exercise_id = parseId(req.params.exerciseId);
    const user_id = req.user.userId;
    const exercise_name = req.body?.exercise_name?.trim();

    if (!template_id || !exercise_id) {
      return res.status(400).json({ error: "Invalid template or exercise id." });
    }

    if (!exercise_name) {
      return res.status(400).json({ error: "Exercise name is required." });
    }

    const default_sets = parseSetCount(req.body?.default_sets);
    if (default_sets === null) {
      return res.status(400).json({
        error: `Sets must be a whole number between ${MIN_SETS} and ${MAX_SETS}.`,
      });
    }

    try {
      if (!(await userOwnsTemplate(template_id, user_id))) {
        return res.status(404).json({ error: "Template not found" });
      }

      // template_id in the WHERE clause stops an exercise being edited through
      // a template that happens to be yours but does not contain it.
      const result = await db.query(
        `UPDATE template_exercises
            SET exercise_name = $1, default_sets = $2
          WHERE id = $3 AND template_id = $4
        RETURNING *`,
        [exercise_name, default_sets, exercise_id, template_id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Exercise not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getExercises: async (req, res) => {
    const template_id = parseId(req.params.id);
    const user_id = req.user.userId;

    if (!template_id) {
      return res.status(400).json({ error: "Invalid template id." });
    }

    try {
      // Checked explicitly rather than filtered in the query below, so someone
      // else's template reads as missing instead of looking empty.
      if (!(await userOwnsTemplate(template_id, user_id))) {
        return res.status(404).json({ error: "Template not found" });
      }

      const result = await db.query(
        "SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY order_index, id",
        [template_id],
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },
};
export default templateController;
