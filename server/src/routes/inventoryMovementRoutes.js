import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { StockMovement } from "../models/StockMovement.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "manager"));

function buildFilters({ store, movementType, from, to }) {
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

  return filters;
}

function filterBySearch(rows, search) {
  const normalized = search.toLowerCase();
  if (!normalized) return rows;

  return rows.filter((item) =>
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
  );
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const store = String(req.query.store || "all").trim();
    const movementType = String(req.query.movementType || "all").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    const filters = buildFilters({ store, movementType, from, to });

    const baseQuery = StockMovement.find(filters)
      .sort({ createdAt: -1 })
      .populate("product", "name sku barcode productNumber")
      .populate("store", "name city")
      .populate("actorUser", "fullName username")
      .lean();

    const rows = await baseQuery;

    return res.json(filterBySearch(rows, search));
  })
);

router.get(
  "/daily-report",
  asyncHandler(async (req, res) => {
    const date = String(req.query.date || "").trim();
    const search = String(req.query.search || "").trim();
    const store = String(req.query.store || "all").trim();
    const movementType = String(req.query.movementType || "all").trim();
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00`).getTime());

    if (!isValidDate) {
      return res.status(400).json({ message: "Избери валидна дата за дневния отчет." });
    }

    const rows = await StockMovement.find(buildFilters({ store, movementType, from: date, to: date }))
      .sort({ "store.name": 1, createdAt: 1 })
      .populate("product", "name sku barcode productNumber")
      .populate("store", "name city")
      .populate("actorUser", "fullName username")
      .lean();

    return res.json(filterBySearch(rows, search));
  })
);

router.get(
  "/daily-summary",
  asyncHandler(async (req, res) => {
    const date = String(req.query.date || "").trim();
    const search = String(req.query.search || "").trim();
    const store = String(req.query.store || "all").trim();
    const movementType = String(req.query.movementType || "all").trim();
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00`).getTime());

    if (!isValidDate) {
      return res.status(400).json({ message: "Избери валидна дата за дневния отчет." });
    }

    const movements = filterBySearch(
      await StockMovement.find(buildFilters({ store, movementType, from: date, to: date }))
        .sort({ createdAt: 1 })
        .populate("product", "name sku barcode productNumber price")
        .populate("store", "name city")
        .lean(),
      search
    );
    const summaries = new Map();

    for (const movement of movements) {
      const storeId = String(movement.store?._id || movement.store || "");
      const productId = String(movement.product?._id || movement.product || "");
      const key = `${storeId}:${productId}`;
      const summary = summaries.get(key) || {
        store: movement.store,
        product: movement.product,
        incomingQuantity: 0,
        outgoingQuantity: 0,
        adjustmentQuantity: 0,
        openingQuantity: Number(movement.quantityBefore || 0),
        closingQuantity: Number(movement.quantityAfter || 0)
      };
      const delta = Number(movement.quantityDelta || 0);

      if (movement.movementType === "in") summary.incomingQuantity += Math.max(0, delta);
      if (movement.movementType === "out") summary.outgoingQuantity += Math.abs(Math.min(0, delta));
      if (movement.movementType === "adjustment") summary.adjustmentQuantity += delta;
      summary.closingQuantity = Number(movement.quantityAfter || 0);
      summaries.set(key, summary);
    }

    return res.json([...summaries.values()]);
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
