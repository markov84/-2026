import bcrypt from "bcryptjs";
import { connectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

async function seedAdmin() {
  await connectDb();

  const existingUser = await User.findOne({ username: env.adminUsername });
  const passwordHash = await bcrypt.hash(env.adminPassword, 10);

  if (existingUser) {
    existingUser.passwordHash = passwordHash;
    existingUser.fullName = "Mark LIGHT Administrator";
    existingUser.role = "admin";
    existingUser.permissions = ["*"];
    existingUser.active = true;
    await existingUser.save();
    console.log(`Updated admin user "${env.adminUsername}".`);
  } else {
    await User.create({
      username: env.adminUsername,
      passwordHash,
      fullName: "Mark LIGHT Administrator",
      role: "admin",
      permissions: ["*"],
      active: true
    });
    console.log(`Created admin user "${env.adminUsername}".`);
  }

  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
