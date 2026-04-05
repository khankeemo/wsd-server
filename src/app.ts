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

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://websmith-z.vercel.app",
  "https://websmith-khankeemos-projects.vercel.app",
  "https://websmith-git-main-khankeemos-projects.vercel.app",
];

const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
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
app.get("/", (req, res) => res.send("OK"));
app.use("/api", routes);

// Serve frontend build
app.use(express.static(path.join(__dirname, "../client")));

export default app;
