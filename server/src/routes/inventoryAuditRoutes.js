import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { InventoryAudit } from "../models/InventoryAudit.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { AuditLog } from "../models/AuditLog.js";
import { clearCachedJson } from "../lib/routeCache.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "manager"));

function toNumber(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeCode(value) {
  return String(value || "").trim();
}

function createAuditNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `REV-${datePart}-${timePart}-${rand}`;
}

function mapAuditSummary(audit) {
  const lines = Array.isArray(audit?.lines) ? audit.lines : [];
  const differences = lines.filter((line) => toNumber(line.countedQuantity) !== toNumber(line.expectedQuantity));

  return {
    ...audit,
    linesCount: lines.length,
    differencesCount: differences.length,
    totalExpected: lines.reduce((sum, line) => sum + toNumber(line.expectedQuantity), 0),
    totalCounted: lines.reduce((sum, line) => sum + toNumber(line.countedQuantity), 0)
  };
}

function mapAuditDetail(audit) {
  const lines = Array.isArray(audit?.lines) ? audit.lines : [];

  return {
    ...mapAuditSummary(audit),
    lines: lines.map((line) => {
      const expectedQuantity = toNumber(line.expectedQuantity);
      const countedQuantity = toNumber(line.countedQuantity);
      return {
        ...line,
        expectedQuantity,
        countedQuantity,
        differenceQuantity: countedQuantity - expectedQuantity
      };
    })
  };
}

async function resolveProductForCode(code, storeId, audit) {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const existingLines = Array.isArray(audit?.lines) ? audit.lines : [];
  const fromAuditLine = existingLines.find((line) => {
    const product = line.product;
    if (!product) return false;
    const scanFields = [product.sku, product.barcode, product.productNumber, product.name]
      .filter(Boolean)
      .map((item) => String(item).trim().toLowerCase());

    return scanFields.includes(normalizedCode.toLowerCase());
  });

  if (fromAuditLine?.product) {
    return fromAuditLine.product;
  }

  return Product.findOne({
    $or: [
      { sku: new RegExp(`^${normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      { barcode: new RegExp(`^${normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      { productNumber: new RegExp(`^${normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
    ]
  }).lean();
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const audits = await InventoryAudit.find()
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .populate("store", "name city")
      .populate("createdBy", "fullName username")
      .populate("approvedBy", "fullName username")
      .lean();

    return res.json(audits.map(mapAuditSummary));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const audit = await InventoryAudit.findById(req.params.id)
      .populate("store", "name city")
      .populate("createdBy", "fullName username")
      .populate("approvedBy", "fullName username")
      .populate("lines.product", "name sku barcode productNumber category brand")
      .populate("lines.scannedBy", "fullName username")
      .lean();

    if (!audit) {
      return res.status(404).json({ message: "Ревизията не е намерена." });
    }

    return res.json(mapAuditDetail(audit));
  })
);

router.post(
  "/",
  [body("store").notEmpty(), body("zone").optional().trim(), body("blindMode").optional().isBoolean()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Невалидни данни за ревизия.", errors: errors.array() });
    }

    const storeExists = await Store.exists({ _id: req.body.store });
    if (!storeExists) {
      return res.status(404).json({ message: "Магазинът не е намерен." });
    }

    const inventoryItems = await InventoryItem.find({ store: req.body.store })
      .populate("product", "name sku barcode productNumber category brand")
      .lean();

    const lines = inventoryItems
      .filter((item) => item.product)
      .map((item) => ({
        product: item.product._id,
        expectedQuantity: toNumber(item.quantity, 0),
        countedQuantity: 0
      }));

    const audit = await InventoryAudit.create({
      auditNumber: createAuditNumber(),
      store: req.body.store,
      zone: req.body.zone?.trim() || "Обща зона",
      blindMode: toBoolean(req.body.blindMode, true),
      status: "counting",
      createdBy: req.user._id,
      lines
    });

    await AuditLog.create({
      action: "create",
      module: "inventory-audit",
      message: `Създадена е ревизия ${audit.auditNumber}.`,
      severity: "info",
      actorName: req.user?.fullName || req.user?.username || "Потребител"
    });

    const populated = await InventoryAudit.findById(audit._id)
      .populate("store", "name city")
      .populate("createdBy", "fullName username")
      .populate("lines.product", "name sku barcode productNumber category brand")
      .lean();

    return res.status(201).json(mapAuditDetail(populated));
  })
);

router.post(
  "/:id/scan",
  [body("code").trim().notEmpty(), body("quantityDelta").optional().isFloat({ min: 0.1 })],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Невалиден код за сканиране.", errors: errors.array() });
    }

    const audit = await InventoryAudit.findById(req.params.id).populate("lines.product", "name sku barcode productNumber");
    if (!audit) {
      return res.status(404).json({ message: "Ревизията не е намерена." });
    }

    if (["completed", "cancelled"].includes(audit.status)) {
      return res.status(400).json({ message: "Ревизията е заключена и не може да се сканира." });
    }

    const product = await resolveProductForCode(req.body.code, audit.store, audit);
    if (!product) {
      return res.status(404).json({ message: `Няма продукт за код ${req.body.code}.` });
    }

    const quantityDelta = toNumber(req.body.quantityDelta, 1);
    let line = audit.lines.find((item) => String(item.product?._id || item.product) === String(product._id));

    if (!line) {
      const inventoryItem = await InventoryItem.findOne({ store: audit.store, product: product._id }).lean();
      audit.lines.push({
        product: product._id,
        expectedQuantity: toNumber(inventoryItem?.quantity, 0),
        countedQuantity: 0
      });
      line = audit.lines[audit.lines.length - 1];
    }

    line.countedQuantity = Math.max(0, toNumber(line.countedQuantity, 0) + quantityDelta);
    line.scannedAt = new Date();
    line.scannedBy = req.user._id;

    await audit.save();

    const populated = await InventoryAudit.findById(audit._id)
      .populate("store", "name city")
      .populate("createdBy", "fullName username")
      .populate("approvedBy", "fullName username")
      .populate("lines.product", "name sku barcode productNumber category brand")
      .populate("lines.scannedBy", "fullName username")
      .lean();

    return res.json(mapAuditDetail(populated));
  })
);

router.put(
  "/:id/line",
  [body("productId").notEmpty(), body("countedQuantity").isFloat({ min: 0 }), body("note").optional().trim()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Невалидни данни за реда.", errors: errors.array() });
    }

    const audit = await InventoryAudit.findById(req.params.id);
    if (!audit) {
      return res.status(404).json({ message: "Ревизията не е намерена." });
    }

    if (["completed", "cancelled"].includes(audit.status)) {
      return res.status(400).json({ message: "Ревизията е заключена." });
    }

    let line = audit.lines.find((item) => String(item.product) === String(req.body.productId));
    if (!line) {
      const [productExists, inventoryItem] = await Promise.all([
        Product.exists({ _id: req.body.productId }),
        InventoryItem.findOne({ store: audit.store, product: req.body.productId }).lean()
      ]);

      if (!productExists) {
        return res.status(404).json({ message: "Продуктът не е намерен." });
      }

      audit.lines.push({
        product: req.body.productId,
        expectedQuantity: toNumber(inventoryItem?.quantity, 0),
        countedQuantity: toNumber(req.body.countedQuantity, 0),
        note: req.body.note?.trim() || ""
      });
      line = audit.lines[audit.lines.length - 1];
    }

    line.countedQuantity = toNumber(req.body.countedQuantity, 0);
    line.note = req.body.note?.trim() || "";
    line.scannedAt = new Date();
    line.scannedBy = req.user._id;

    await audit.save();

    const populated = await InventoryAudit.findById(audit._id)
      .populate("store", "name city")
      .populate("createdBy", "fullName username")
      .populate("approvedBy", "fullName username")
      .populate("lines.product", "name sku barcode productNumber category brand")
      .populate("lines.scannedBy", "fullName username")
      .lean();

    return res.json(mapAuditDetail(populated));
  })
);

router.post(
  "/:id/finalize",
  asyncHandler(async (req, res) => {
    const audit = await InventoryAudit.findById(req.params.id).lean();
    if (!audit) {
      return res.status(404).json({ message: "Ревизията не е намерена." });
    }

    if (audit.status === "completed") {
      return res.status(400).json({ message: "Ревизията вече е приключена." });
    }

    if (audit.status === "cancelled") {
      return res.status(400).json({ message: "Отказана ревизия не може да бъде приключена." });
    }

    const updates = (audit.lines || []).filter(
      (line) => toNumber(line.countedQuantity, 0) !== toNumber(line.expectedQuantity, 0)
    );

    for (const line of updates) {
      const existing = await InventoryItem.findOne({ store: audit.store, product: line.product }).lean();
      await InventoryItem.findOneAndUpdate(
        { store: audit.store, product: line.product },
        {
          store: audit.store,
          product: line.product,
          quantity: toNumber(line.countedQuantity, 0),
          reserved: toNumber(existing?.reserved, 0),
          reorderLevel: toNumber(existing?.reorderLevel, 5)
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      );
    }

    await InventoryAudit.findByIdAndUpdate(
      audit._id,
      {
        status: "completed",
        approvedBy: req.user._id,
        completedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    clearCachedJson("inventory:");

    await AuditLog.create({
      action: "complete",
      module: "inventory-audit",
      message: `Приключена е ревизия ${audit.auditNumber} с ${updates.length} корекции.`,
      severity: updates.length ? "warning" : "info",
      actorName: req.user?.fullName || req.user?.username || "Потребител"
    });

    const populated = await InventoryAudit.findById(audit._id)
      .populate("store", "name city")
      .populate("createdBy", "fullName username")
      .populate("approvedBy", "fullName username")
      .populate("lines.product", "name sku barcode productNumber category brand")
      .populate("lines.scannedBy", "fullName username")
      .lean();

    return res.json(mapAuditDetail(populated));
  })
);

export default router;
