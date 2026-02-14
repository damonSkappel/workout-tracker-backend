import express from "express";
import controller from "../controllers/templateController.js";

const router = express.Router();

router.get("/", controller.get);

router.post("/", controller.post);

export default router;
