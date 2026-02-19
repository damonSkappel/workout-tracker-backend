import "dotenv/config";
import express from "express";
import userRoutes from "./src/routes/users.js";
import templateRoutes from "./src/routes/templates.js";
import sessionRoutes from "./src/routes/sessions.js";
import setRoutes from "./src/routes/sets.js";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// shows me the users when I go to /api/users
app.use("/api/users", userRoutes);

//Shows me the workout templates
app.use("/api/templates", templateRoutes);

// Shows me the workout sessions
app.use("/api/sessions", sessionRoutes);

// updates sets in sessions
app.use("/api/sets", setRoutes);

// Takes me to the root of the API, not REALLY needed, but it's a nice touch
app.get("/", (req, res) => {
  res.send("Hi there!");
});

app.listen(port, () => {
  console.log(`Example app is running on port ${port}`);
});
