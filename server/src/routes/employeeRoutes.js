import { Router } from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("admin", "manager"), async (req, res) => {
  const employees = await User.find().select("-passwordHash").sort({ createdAt: -1 }).lean();
  return res.json(employees);
});

router.post(
  "/",
  requireRole("admin"),
  [
    body("username").trim().notEmpty(),
    body("fullName").trim().notEmpty(),
    body("password").isString().isLength({ min: 6 }),
    body("role").isIn(["admin", "manager", "sales", "warehouse"])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid employee payload.", errors: errors.array() });
    }

    const existing = await User.findOne({ username: req.body.username });
    if (existing) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const employee = await User.create({
      username: req.body.username,
      fullName: req.body.fullName,
      passwordHash,
      role: req.body.role,
      permissions: req.body.permissions || [],
      active: req.body.active ?? true
    });

    return res.status(201).json({
      id: employee._id,
      username: employee.username,
      fullName: employee.fullName,
      role: employee.role,
      permissions: employee.permissions,
      active: employee.active,
      createdAt: employee.createdAt
    });
  }
);

router.put(
  "/:id",
  requireRole("admin"),
  [
    body("username").optional().trim().notEmpty(),
    body("fullName").optional().trim().notEmpty(),
    body("password").optional().isString().isLength({ min: 6 }),
    body("role").optional().isIn(["admin", "manager", "sales", "warehouse"])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid employee payload.", errors: errors.array() });
    }

    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    if (req.body.username && req.body.username !== employee.username) {
      const existing = await User.findOne({ username: req.body.username });
      if (existing) {
        return res.status(409).json({ message: "Username already exists." });
      }
      employee.username = req.body.username;
    }

    if (req.body.fullName) employee.fullName = req.body.fullName;
    if (req.body.role) employee.role = req.body.role;
    if (Array.isArray(req.body.permissions)) employee.permissions = req.body.permissions;
    if (typeof req.body.active === "boolean") employee.active = req.body.active;
    if (req.body.password) {
      employee.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    await employee.save();

    return res.json({
      id: employee._id,
      username: employee.username,
      fullName: employee.fullName,
      role: employee.role,
      permissions: employee.permissions,
      active: employee.active,
      createdAt: employee.createdAt
    });
  }
);

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const employee = await User.findByIdAndDelete(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: "Employee not found." });
  }

  return res.status(204).send();
});

export default router;
