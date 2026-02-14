import express from "express";
import controller from "../controllers/templateController.js";

const router = express.Router();

router.get("/", controller.get);

router.post("/", controller.post);

router.post("/:id/exercises", controller.postExercise);

router.get("/:id/exercises", controller.getExercises);

export default router;
