import "dotenv/config";
import express from "express";
import userRoutes from "./src/routes/users.js";
import templateRoutes from "./src/routes/templates.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// shows me the users when I go to /api/users
app.use("/api/users", userRoutes);

//Shows me the workout templates
app.use("/api/templates", templateRoutes);

// Takes me to the root of the API, not REALLY needed, but it's a nice touch
app.get("/", (req, res) => {
  res.send("Hi there!");
});

app.listen(port, () => {
  console.log(`Example app is running on port ${port}`);
});
