import express from "express";
import controller from "../controllers/authController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import {
  loginLimiter,
  refreshLimiter,
  registerLimiter,
} from "../middleware/rateLimiters.js";

const router = express.Router();

router.post("/register", registerLimiter, controller.register);
router.post("/login", loginLimiter, controller.login);
router.post("/refresh", refreshLimiter, controller.refresh);
router.post("/logout", controller.logout);
router.get("/verify", authenticateToken, controller.verify);

export default router;
