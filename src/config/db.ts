// C:\wsd-server\src\config\db.ts
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // Change MONGO_URI to MONGODB_URI to match .env file
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("DB Error ❌", error);
    process.exit(1);
  }
};