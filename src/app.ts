import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import routes from "./routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use("/api", routes);

// Serve frontend build
app.use(express.static(path.join(__dirname, "../client")));

export default app;
