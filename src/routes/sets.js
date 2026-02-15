import express from "express";
import controller from "../controllers/setController.js";

const router = express.Router();

router.put("/:id", controller.updateSet); // ← This line is failing

export default router;
