import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import routes from "./routes";
import { connectDB } from "./config/dbConnection";

dotenv.config({ quiet: true });

const app = express();

connectDB().catch((error) => {
  console.error("Initial database connection failed", error);
});

const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : true,
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// API routes
app.use("/api", routes);

// Serve frontend build
app.use(express.static(path.join(__dirname, "../client")));

export default app;
