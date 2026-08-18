import db from "../database/connection.js";

const userController = {
  /**
   * Returns the signed-in user only.
   *
   * This used to be `SELECT * FROM users`, which handed every caller the full
   * user table including bcrypt password hashes. Even hashed, those are worth
   * stealing: an attacker can crack them offline at their leisure. The column
   * is now listed explicitly so a future schema change cannot quietly put a
   * secret back into this response.
   */
  get: async (req, res) => {
    try {
      const result = await db.query(
        "SELECT id, email, username, created_at FROM users WHERE id = $1",
        [req.user.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default userController;
