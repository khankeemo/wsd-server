import mongoose from "mongoose";

let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
  const dbName = process.env.MONGODB_DB_NAME || process.env.DB_NAME;

  if (!mongoURI) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(
      mongoURI,
      dbName
        ? {
            dbName,
          }
        : undefined
    )
    .then((connection) => {
      console.log("MongoDB connected");
      return connection;
    })
    .catch((error) => {
      connectionPromise = null;
      console.error("DB connection error", error);
      throw error;
    });

  return connectionPromise;
};
