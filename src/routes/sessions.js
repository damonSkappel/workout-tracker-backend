import express from "express";
import controller from "../controllers/sessionController.js";

const router = express.Router();

router.post("/", controller.post);

router.get("/", controller.get);

export default router;
