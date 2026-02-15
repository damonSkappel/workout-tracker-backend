import db from "../database/connection.js";

const setController = {
  updateSet: async (req, res) => {
    const set_id = parseInt(req.params.id);
    const { weight, reps, completed } = req.body;

    console.log("Trying to update set_id:", set_id); // ← Add this
    console.log("With data:", { weight, reps, completed }); // ← Add this

    try {
      const result = await db.query(
        "UPDATE sets SET weight = $1, reps = $2, completed = $3 WHERE id = $4 RETURNING *",
        [weight, reps, completed, set_id],
      );

      console.log("Rows updated:", result.rows.length); // ← Add this

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },
};

export default setController;
