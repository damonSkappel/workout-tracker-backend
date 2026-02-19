import db from "../database/connection.js";
const sessionController = {
  getSession: async (req, res) => {
    const session_id = req.params.id;
    try {
      const sessionInfo = await db.query(
        "SELECT * FROM workout_sessions WHERE id = $1",
        [session_id],
      );
      if (sessionInfo.rows.length === 0) {
        return res.status(404).send("Session not found");
      }
      const session = sessionInfo.rows[0];
      const getExercises = await db.query(
        "SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY order_index",
        [session.template_id],
      );
      const exercises = getExercises.rows;

      const getSets = await db.query(
        "SELECT * FROM sets WHERE session_id = $1 ORDER BY id",
        [session_id],
      );
      const sets = getSets.rows;

      const responseData = {
        session: session,
        exercises: exercises,
        sets: sets,
      };
      res.json(responseData);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

  get: async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM workout_sessions");
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

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
