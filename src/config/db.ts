// C:\wsd-server\src\config\db.ts
import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
        const dbName = process.env.MONGODB_DB_NAME || process.env.DB_NAME;

        if (!mongoURI) {
            console.error("❌ Error: MONGODB_URI is not defined in the .env file.");
            console.log("👉 Please add MONGODB_URI=your_mongodb_connection_string to wsd-server/.env");
            process.exit(1);
        }

        await mongoose.connect(
            mongoURI,
            dbName
                ? {
                    dbName,
                }
                : undefined
        );
        console.log("MongoDB Connected ✅");
    } catch (error) {
        console.error("DB Connection Error ❌", error);
        process.exit(1);
    }
};
