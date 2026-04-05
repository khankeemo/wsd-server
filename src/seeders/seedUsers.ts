import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/dbConnection";
import User from "../models/User";

dotenv.config();

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "client" | "developer";
  phone?: string;
  company?: string;
};

const seedUsers: SeedUser[] = [
  {
    name: "Admin User",
    email: process.env.SEED_ADMIN_EMAIL || "admin@wsd.com",
    password: process.env.SEED_ADMIN_PASSWORD || "admin123",
    role: "admin",
    company: "WSD",
  },
  {
    name: "Client User",
    email: process.env.SEED_CLIENT_EMAIL || "client@wsd.com",
    password: process.env.SEED_CLIENT_PASSWORD || "client123",
    role: "client",
    company: "Client Company",
  },
  {
    name: "Developer User",
    email: process.env.SEED_DEVELOPER_EMAIL || "developer@wsd.com",
    password: process.env.SEED_DEVELOPER_PASSWORD || "developer123",
    role: "developer",
    company: "WSD",
  },
];

const seed = async () => {
  try {
    await connectDB();

    await User.deleteMany({});
    console.log("Cleared all existing users.");

    const usersToInsert = await Promise.all(
      seedUsers.map(async (user) => ({
        name: user.name,
        email: user.email.toLowerCase(),
        password: await bcrypt.hash(user.password, 10),
        role: user.role,
        phone: user.phone || "",
        company: user.company || "",
        isOAuthUser: false,
        provider: null,
        providerId: "",
      }))
    );

    await User.insertMany(usersToInsert);

    for (const user of seedUsers) {
      console.log(`Seeded ${user.role}: ${user.email}`);
    }

    console.log("User seeding completed successfully.");
  } catch (error) {
    console.error("User seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seed();
