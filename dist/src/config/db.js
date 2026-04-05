"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
// C:\wsd-server\src\config\db.ts
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
        const dbName = process.env.MONGODB_DB_NAME || process.env.DB_NAME;
        if (!mongoURI) {
            console.error("❌ Error: MONGODB_URI is not defined in the .env file.");
            console.log("👉 Please add MONGODB_URI=your_mongodb_connection_string to wsd-server/.env");
            process.exit(1);
        }
        await mongoose_1.default.connect(mongoURI, dbName
            ? {
                dbName,
            }
            : undefined);
        console.log("MongoDB Connected ✅");
    }
    catch (error) {
        console.error("DB Connection Error ❌", error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
