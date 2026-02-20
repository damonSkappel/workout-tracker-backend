import db from "../database/connection.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const authController = {
  register: async (req, res) => {
    //Registration logic
    const { email, username, password } = req.body;

    try {
      // Step 1, Check if user already exists
      const existingUser = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [email],
      );
      if (existingUser.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "User with this email already exists" });
      }

      // Step 2, Hash the password
      const saltRounts = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounts);

      //Step 3 Create User

      const result = await db.query(
        "INSERT INTO users (email, username, password, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, email, username, password, created_at",
        [email, username, hashedPassword],
      );

      const newUser = result.rows[0];

      //Step 4, Generate JWT Token
      const token = jwt.sign(
        {
          userId: newUser.id,
          email: newUser.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
      );

      //Step 5, Send back toekn and user info
      res.status(201).json({
        message: "User registered successfully",
        token: token,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
        },
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  login: async (req, res) => {
    //Login logic
  },
};

export default authController;
