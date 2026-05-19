import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
      permissions: user.permissions
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}
