import express from "express";
import controller from "../controllers/sessionController.js";

const router = express.Router();

router.post("/", controller.post);

router.get("/", controller.get);

router.get("/history", controller.getHistory); // Must be before /:id

router.get("/:id", controller.getSession);

router.put("/:id", controller.completeSession);

export default router;
