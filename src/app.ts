import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import routes from "./routes";
import { connectDB } from "./config/dbConnection";
import { cleanupArchivedTickets } from "./controllers/ticket.controller";

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

const isAllowedOrigin = (origin: string) => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }
    return hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({
  verify: (req, _res, buf) => {
    if (buf && buf.length) {
      (req as any).rawBody = buf;
    }
  },
}));
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

const ticketUploadsDir = path.join(process.cwd(), "uploads", "tickets");
app.use("/api/uploads/tickets", express.static(ticketUploadsDir));

// API routes
app.get("/", (req, res) => res.send("OK"));
app.use("/api", routes);

// Serve frontend build
app.use(express.static(path.join(__dirname, "../client")));

const runTicketCleanup = async () => {
  try {
    await cleanupArchivedTickets();
  } catch (error) {
    console.error("Ticket cleanup failed", error);
  }
};

runTicketCleanup();
setInterval(runTicketCleanup, 6 * 60 * 60 * 1000);

export default app;
