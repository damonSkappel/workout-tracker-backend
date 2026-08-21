import db from "../database/connection.js";
import { parseId, userOwnsTemplate } from "../services/ownership.js";
const sessionController = {
  getSession: async (req, res) => {
    const session_id = parseId(req.params.id);
    const user_id = req.user.userId;

    if (!session_id) {
      return res.status(400).json({ error: "Invalid session id." });
    }

    try {
      const sessionInfo = await db.query(
        "SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2",
        [session_id, user_id],
      );
      // 404 rather than 403: a session that is not yours should look like one
      // that does not exist, so this cannot be used to probe for other users.
      if (sessionInfo.rows.length === 0) {
        return res.status(404).json({ error: "Session not found" });
      }
      const session = sessionInfo.rows[0];
      const getExercises = await db.query(
        "SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY order_index, id",
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
      const result = await db.query(
        "SELECT * FROM workout_sessions WHERE user_id = $1 ORDER BY date DESC",
        [req.user.userId],
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

  post: async (req, res) => {
    const { date } = req.body;
    const template_id = parseId(req.body?.template_id);
    const user_id = req.user.userId;

    if (!template_id) {
      return res.status(400).json({ error: "A valid template id is required." });
    }

    try {
      if (!(await userOwnsTemplate(template_id, user_id))) {
        return res.status(404).json({ error: "Template not found" });
      }

      const exerciseCount = await db.query(
        "SELECT COUNT(*) AS count FROM template_exercises WHERE template_id = $1",
        [template_id],
      );

      if (Number(exerciseCount.rows[0].count) === 0) {
        return res.status(400).json({
          error: "Cannot start a workout with no exercises in the template.",
        });
      }

      const result = await db.query(
        "INSERT INTO workout_sessions (user_id, template_id, date) VALUES ($1, $2, $3) RETURNING *",
        [user_id, template_id, date],
      );
      const exercises = await db.query(
        "SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY order_index, id",
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

  getHistory: async (req, res) => {
    const user_id = req.user.userId;
    try {
      const result = await db.query(
        `SELECT 
        t.id as template_id,
        t.name as template_name,
        s.id as session_id,
        s.date
      FROM workout_sessions s
      JOIN workout_templates t ON s.template_id = t.id
      WHERE s.user_id = $1
      AND s.completed = true
      ORDER BY t.name, s.date DESC`,
        [user_id],
      );

      // Group the flat rows into { template_id, template_name, sessions: [] }
      const grouped = {};
      for (const row of result.rows) {
        if (!grouped[row.template_id]) {
          grouped[row.template_id] = {
            template_id: row.template_id,
            template_name: row.template_name,
            sessions: [],
          };
        }
        grouped[row.template_id].sessions.push({
          session_id: row.session_id,
          date: row.date,
        });
      }

      res.json(Object.values(grouped));
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

  completeSession: async (req, res) => {
    const session_id = parseId(req.params.id);
    const user_id = req.user.userId;

    if (!session_id) {
      return res.status(400).json({ error: "Invalid session id." });
    }

    try {
      const result = await db.query(
        "UPDATE workout_sessions SET completed = true WHERE id = $1 AND user_id = $2 RETURNING *",
        [session_id, user_id],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },
};

export default sessionController;
