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
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : true,
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
app.use("/api", routes_1.default);
// Serve frontend build
app.use(express_1.default.static(path_1.default.join(__dirname, "../client")));
exports.default = app;
