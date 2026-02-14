import db from "../database/connection.js";
const userController = {
  get: async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM users");
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },
};

export default userController;
