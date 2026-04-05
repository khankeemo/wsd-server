import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import routes from "./routes";

dotenv.config();

const app = express();

const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : true,
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// API routes
app.get("/", (req, res) => res.send("OK"));
app.use("/api", routes);

// Serve frontend build
app.use(express.static(path.join(__dirname, "../client")));

export default app;
