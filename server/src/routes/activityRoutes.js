import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ActivityLog } from "../models/ActivityLog.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", async (req, res) => {
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 200;
  const entries = await ActivityLog.find()
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .populate("actorUser", "username")
    .lean();

  return res.json(entries);
});

export default router;
