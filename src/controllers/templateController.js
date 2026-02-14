import db from "../database/connection.js";
const templateController = {
  get: async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM workout_templates");
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

  post: async (req, res) => {
    const { name, user_id } = req.body;
    try {
      const result = await db.query(
        "INSERT INTO workout_templates (name, user_id) VALUES ($1, $2) RETURNING *",
        [name, user_id],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },
};

export default templateController;
