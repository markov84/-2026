import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { StockMovement } from "../models/StockMovement.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "manager"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const store = String(req.query.store || "all").trim();
    const movementType = String(req.query.movementType || "all").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    const filters = {};

    if (store && store !== "all") {
      filters.store = store;
    }

    if (movementType && movementType !== "all") {
      filters.movementType = movementType;
    }

    if (from || to) {
      filters.createdAt = {};
      if (from) {
        const fromDate = new Date(`${from}T00:00:00`);
        if (!Number.isNaN(fromDate.getTime())) filters.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(`${to}T00:00:00`);
        if (!Number.isNaN(toDate.getTime())) {
          filters.createdAt.$lt = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
        }
      }
      if (!Object.keys(filters.createdAt).length) {
        delete filters.createdAt;
      }
    }

    const baseQuery = StockMovement.find(filters)
      .sort({ createdAt: -1 })
      .limit(600)
      .populate("product", "name sku barcode productNumber")
      .populate("store", "name city")
      .populate("actorUser", "fullName username")
      .lean();

    const rows = await baseQuery;

    const normalized = search.toLowerCase();
    const filteredRows = normalized
      ? rows.filter((item) =>
          [
            item.product?.name,
            item.product?.sku,
            item.product?.barcode,
            item.product?.productNumber,
            item.reason,
            item.sourceModule,
            item.actorName,
            item.actorUser?.fullName,
            item.actorUser?.username,
            item.store?.name,
            item.store?.city
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalized))
        )
      : rows;

    return res.json(filteredRows);
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const movement = await StockMovement.findByIdAndDelete(req.params.id);
    if (!movement) {
      return res.status(404).json({ message: "Движението не е намерено." });
    }
    res.json({ message: "Движението е успешно изтрито.", movement });
  })
);

export default router;
