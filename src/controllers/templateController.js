import db from "../database/connection.js";
import { parseId, userOwnsTemplate } from "../services/ownership.js";
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
    const { exercise_name, order_index } = req.body;
    const template_id = parseId(req.params.id);
    const user_id = req.user.userId;

    if (!template_id) {
      return res.status(400).json({ error: "Invalid template id." });
    }

    try {
      // Without this, anyone could add exercises to someone else's template.
      if (!(await userOwnsTemplate(template_id, user_id))) {
        return res.status(404).json({ error: "Template not found" });
      }

      const result = await db.query(
        "INSERT INTO template_exercises (exercise_name, order_index, template_id) VALUES ($1, $2, $3) RETURNING *",
        [exercise_name, order_index, template_id],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
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
        "SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY order_index",
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
