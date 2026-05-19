import mongoose from "mongoose";
import { env } from "./env.js";
import { ensureProductIndexes } from "../models/Product.js";

export async function connectDb() {
  if (!env.mongoUri) {
    throw new Error("Missing MONGODB_URI in environment variables.");
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000
    });
    await ensureProductIndexes();
  } catch (error) {
    if (error?.code === 8000 || error?.codeName === "AtlasError") {
      const sanitizedUri = env.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
      const hint = [
        "MongoDB Atlas rejected the username/password in MONGODB_URI.",
        `Current URI: ${sanitizedUri}`,
        "Check these items:",
        "1. The Atlas database user and password are correct.",
        "2. Any special character in the password is URL-encoded, for example '+' => '%2B'.",
        "3. The Atlas user still exists and has access to the target database.",
        "4. If you recently changed the password in Atlas, update server/.env and restart the server."
      ].join("\n");

      error.message = `${hint}\nOriginal error: ${error.message}`;
    }

    throw error;
  }
}
