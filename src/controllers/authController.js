import db from "../database/connection.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../services/refreshTokens.js";

// Kept in sync with the signup screen's client-side checks, so a direct API
// call can't create an account the app itself would have rejected.
const MIN_PASSWORD_LENGTH = 6;
const MIN_USERNAME_LENGTH = 2;
const MAX_USERNAME_LENGTH = 30;
const MAX_EMAIL_LENGTH = 254; // the practical limit from RFC 5321

/**
 * Deliberately loose: "something, an @, something, a dot, something".
 *
 * Validating email properly by pattern is a fool's errand -- the real grammar
 * allows quoted strings, comments and bracketed IP literals, and strict-looking
 * regexes are famous for rejecting addresses that genuinely work. The only real
 * proof an address exists is sending mail to it. This just catches the honest
 * mistakes, like a missing @ or a bare word.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error string, or null when the input is acceptable. */
const validateCredentials = ({ email, username, password }) => {
  if (!email || !password) return "Email and password are required.";
  if (username !== undefined && !username) return "Username is required.";

  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return "Please enter a valid email address.";
  }

  if (
    username !== undefined &&
    (username.length < MIN_USERNAME_LENGTH || username.length > MAX_USERNAME_LENGTH)
  ) {
    return `Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters.`;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return null;
};

// Short-lived on purpose: the refresh token is what keeps a user signed in, so
// a leaked access token stops working in minutes rather than a day.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_ISSUER = process.env.JWT_ISSUER || "workout-tracker-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "workout-tracker-mobile";

const signAccessToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
};

const authController = {
  register: async (req, res) => {
    //Registration logic
    const email = req.body?.email?.trim().toLowerCase();
    const username = req.body?.username?.trim();
    const password = req.body?.password;

    if (!email || !username || !password) {
      return res.status(400).json({ error: "Email, username, and password are required." });
    }

    const invalid = validateCredentials({ email, username, password });
    if (invalid) {
      return res.status(400).json({ error: invalid });
    }

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
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      //Step 3 Create User

      const result = await db.query(
        "INSERT INTO users (email, username, password, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, email, username, password, created_at",
        [email, username, hashedPassword],
      );

      const newUser = result.rows[0];

      //Step 4, Generate JWT Token
      const token = signAccessToken(newUser.id, newUser.email);

      const refreshToken = await issueRefreshToken(newUser.id);

      //Step 5, Send back toekn and user info
      res.status(201).json({
        message: "User registered successfully",
        token: token,
        refreshToken: refreshToken,
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
    //get the users email and password input
    const email = req.body?.email?.trim().toLowerCase();
    const password = req.body?.password;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    try {
      //check if the user exists in the database
      const existingUser = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [email],
      );
      if (existingUser.rows.length === 0) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const user = existingUser.rows[0];

      //check if the password they submitted matches the hashed password in the database
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      // if it matches, generate a JWT token and send it back to the client
      const token = signAccessToken(user.id, user.email);

      const refreshToken = await issueRefreshToken(user.id);

      res.json({
        message: "Login successful",
        token: token,
        refreshToken: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  refresh: async (req, res) => {
    const presented = req.body?.refreshToken;

    if (!presented) {
      return res.status(400).json({ error: "Refresh token is required." });
    }

    try {
      const result = await rotateRefreshToken(presented);

      if (result.status === "reused") {
        console.warn(
          `[auth] Refresh token reuse detected for user ${result.userId}; all sessions revoked.`,
        );
        return res
          .status(401)
          .json({ error: "Session is no longer valid. Please log in again." });
      }

      if (result.status !== "rotated") {
        return res
          .status(401)
          .json({ error: "Session is no longer valid. Please log in again." });
      }

      return res.json({
        token: signAccessToken(result.userId, result.email),
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      console.error("Error during token refresh:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  logout: async (req, res) => {
    const presented = req.body?.refreshToken;

    try {
      if (presented) await revokeRefreshToken(presented);
      // Always 204: whether that token existed is not the caller's business.
      return res.status(204).send();
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  verify: async (req, res) => {
    return res.json({
      valid: true,
      user: {
        userId: req.user.userId,
        email: req.user.email,
      },
    });
  },
};

export default authController;
