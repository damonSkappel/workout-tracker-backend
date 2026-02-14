import express from "express";
import controller from "../controllers/sessionController.js";

const router = express.Router();

router.post("/", controller.post);

export default router;
