import db from "../database/connection.js";
const sessionController = {
  post: async (req, res) => {
    const { user_id, template_id, date } = req.body;
    try {
      const result = await db.query(
        "INSERT INTO workout_sessions (user_id, template_id, date) VALUES ($1, $2, $3) RETURNING *",
        [user_id, template_id, date],
      );
      const exercises = await db.query(
        "SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY order_index",
        [template_id],
      );
      const session_id = result.rows[0].id; // Get the id of the session I just created
      for (const exercise of exercises.rows) {
        for (
          let setNumber = 1;
          setNumber <= exercise.default_sets;
          setNumber++
        ) {
          await db.query(
            "INSERT INTO sets (session_id, template_exercise_id, set_number, completed) VALUES ($1, $2, $3, $4)",
            [session_id, exercise.id, setNumber, false],
          );
        }
      }
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },
};

export default sessionController;
