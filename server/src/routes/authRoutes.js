import { Router } from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { createAuthLimiter } from "../middleware/rateLimit.js";
import { env } from "../config/env.js";

const router = Router();
const loginLimiter = createAuthLimiter();

router.post(
  "/login",
  loginLimiter,
  [
    body("username").trim().notEmpty(),
    body("password").isString().notEmpty()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid login payload.", errors: errors.array() });
    }

    const { username, password } = req.body;
    const normalizedUsername = String(username || "").trim().toLowerCase();
    const user = await User.findOne({ username: { $regex: new RegExp(`^${normalizedUsername}$`, "i") } });

    if (!user || !user.active || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions
      }
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    return res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        fullName: req.user.fullName,
        role: req.user.role,
        permissions: req.user.permissions
      }
    });
  })
);

export default router;
