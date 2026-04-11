"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const dbConnection_1 = require("./config/dbConnection");
dotenv_1.default.config({ quiet: true });
const app = (0, express_1.default)();
(0, dbConnection_1.connectDB)().catch((error) => {
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
const isAllowedOrigin = (origin) => {
    if (allowedOrigins.includes(origin)) {
        return true;
    }
    try {
        const { hostname } = new URL(origin);
        return hostname.endsWith(".vercel.app");
    }
    catch {
        return false;
    }
};
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || isAllowedOrigin(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(async (_req, _res, next) => {
    try {
        await (0, dbConnection_1.connectDB)();
        next();
    }
    catch (error) {
        next(error);
    }
});
// API routes
app.get("/", (req, res) => res.send("OK"));
app.use("/api", routes_1.default);
// Serve frontend build
app.use(express_1.default.static(path_1.default.join(__dirname, "../client")));
exports.default = app;
