import db from "../database/connection.js";
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
    const user_id = req.user.user_id;
    try {
      const result = await db.query(
        "INSERT INTO workout_templates (name, user_id) VALUES ($1, $2) RETURNING *",
        [name, req.user.userId],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

  postExercise: async (req, res) => {
    const { exercise_name, order_index } = req.body;
    const template_id = req.params.id;
    try {
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
    const template_id = req.params.id;
    try {
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
