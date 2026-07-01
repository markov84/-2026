import { Router } from "express";
import { body, validationResult } from "express-validator";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { SupplierOrder } from "../models/SupplierOrder.js";
import { Supplier } from "../models/Supplier.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { getNextDocumentNumber } from "../lib/documentNumbers.js";
import { applyInventoryDelta } from "../lib/inventory.js";
import { clearCachedJson } from "../lib/routeCache.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "manager", "warehouse"));

async function getNextSupplierOrderNumber() {
  return getNextDocumentNumber({
    model: SupplierOrder,
    field: "orderNumber",
    counterKey: "supplier-order",
    prefix: "PO"
  });
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

router.get(
  "/next-number",
  asyncHandler(async (req, res) => {
    const nextNumber = await getNextSupplierOrderNumber();
    return res.json({ orderNumber: nextNumber });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await SupplierOrder.find()
      .sort({ createdAt: -1 })
      .populate("store", "name city")
      .populate("items.product", "name productNumber sku barcode price cost vatRate imageUrl")
      .lean();

    return res.json(orders);
  })
);

router.post(
  "/",
  [
    body("supplier.name").trim().notEmpty(),
    body("store").notEmpty(),
    body("items").isArray({ min: 1 }),
    body("requestedBy").optional().trim(),
    body("status").optional().isIn(["draft", "sent", "received", "cancelled"])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Невалидни данни за поръчката към доставчик.", errors: errors.array() });
    }

    const storeExists = await Store.exists({ _id: req.body.store });
    if (!storeExists) {
      return res.status(404).json({ message: "Магазинът/складът не е намерен." });
    }

    if (req.body.supplierRef) {
      const supplierExists = await Supplier.exists({ _id: req.body.supplierRef });
      if (!supplierExists) {
        return res.status(404).json({ message: "Доставчикът не е намерен." });
      }
    }

    const productIds = [...new Set((req.body.items || []).map((item) => String(item.product)))];
    const productCount = await Product.countDocuments({ _id: { $in: productIds } });
    if (productCount !== productIds.length) {
      return res.status(404).json({ message: "Един или повече продукти не са намерени." });
    }

    const order = await SupplierOrder.create({
      orderNumber: req.body.orderNumber?.trim() || (await getNextSupplierOrderNumber()),
      supplierRef: req.body.supplierRef || undefined,
      supplier: req.body.supplier,
      store: req.body.store,
      items: (req.body.items || []).map((item) => ({
        product: item.product,
        quantity: toNumber(item.quantity, 0),
        unitCost: toNumber(item.unitCost, 0)
      })),
      status: req.body.status || "draft",
      requestedBy: req.body.requestedBy || req.user?.fullName || req.user?.username,
      expectedDate: req.body.expectedDate || undefined,
      notes: req.body.notes || undefined
    });

    const populated = await SupplierOrder.findById(order._id)
      .populate("store", "name city")
      .populate("items.product", "name productNumber sku barcode price cost vatRate imageUrl")
      .lean();

    return res.status(201).json(populated);
  })
);

router.put(
  "/:id",
  [
    body("supplier.name").optional().trim().notEmpty(),
    body("store").optional().notEmpty(),
    body("items").optional().isArray({ min: 1 }),
    body("status").optional().isIn(["draft", "sent", "received", "cancelled"])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Невалидни данни за поръчката към доставчик.", errors: errors.array() });
    }

    const existing = await SupplierOrder.findById(req.params.id).lean();
    if (!existing) {
      return res.status(404).json({ message: "Поръчката към доставчик не е намерена." });
    }

    if (existing.status === "received") {
      return res.status(400).json({ message: "Получена поръчка не може да се редактира." });
    }

    const nextStore = req.body.store || String(existing.store);
    const storeExists = await Store.exists({ _id: nextStore });
    if (!storeExists) {
      return res.status(404).json({ message: "Магазинът/складът не е намерен." });
    }

    if (req.body.supplierRef) {
      const supplierExists = await Supplier.exists({ _id: req.body.supplierRef });
      if (!supplierExists) {
        return res.status(404).json({ message: "Доставчикът не е намерен." });
      }
    }

    const nextItems = req.body.items || existing.items;
    const productIds = [...new Set((nextItems || []).map((item) => String(item.product?._id || item.product)))];
    const productCount = await Product.countDocuments({ _id: { $in: productIds } });
    if (productCount !== productIds.length) {
      return res.status(404).json({ message: "Един или повече продукти не са намерени." });
    }

    const updated = await SupplierOrder.findByIdAndUpdate(
      req.params.id,
      {
        supplierRef: req.body.supplierRef || existing.supplierRef || undefined,
        supplier: req.body.supplier || existing.supplier,
        store: nextStore,
        items: nextItems.map((item) => ({
          product: item.product?._id || item.product,
          quantity: toNumber(item.quantity, 0),
          unitCost: toNumber(item.unitCost, 0)
        })),
        status: req.body.status || existing.status,
        requestedBy: req.body.requestedBy || existing.requestedBy,
        expectedDate: req.body.expectedDate || undefined,
        notes: req.body.notes || undefined
      },
      { new: true, runValidators: true }
    )
      .populate("store", "name city")
      .populate("items.product", "name productNumber sku barcode price cost vatRate imageUrl")
      .lean();

    return res.json(updated);
  })
);

router.post(
  "/:id/receive",
  asyncHandler(async (req, res) => {
    const order = await SupplierOrder.findById(req.params.id).populate("items.product", "name productNumber sku barcode price cost vatRate imageUrl");
    if (!order) {
      return res.status(404).json({ message: "Поръчката към доставчик не е намерена." });
    }

    if (["received", "cancelled"].includes(order.status)) {
      return res.status(400).json({ message: "Тази поръчка не може да бъде приета." });
    }

    for (const item of order.items) {
      await applyInventoryDelta({
        productId: item.product?._id || item.product,
        storeId: order.store,
        quantityDelta: toNumber(item.quantity, 0),
        movement: {
          sourceModule: "supplier-order",
          sourceDocumentId: order._id,
          movementType: "in",
          reason: `Доставка от доставчик ${order.supplier?.name || ""}`.trim(),
          actorUser: req.user?._id,
          actorName: req.user?.fullName || req.user?.username
        }
      });
    }

    order.status = "received";
    order.receivedAt = new Date();
    await order.save();
    clearCachedJson("inventory:");

    const populated = await SupplierOrder.findById(order._id)
      .populate("store", "name city")
      .populate("items.product", "name productNumber sku barcode price cost vatRate imageUrl")
      .lean();

    return res.json(populated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await SupplierOrder.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ message: "Поръчката към доставчик не е намерена." });
    }

    if (order.status === "received") {
      return res.status(400).json({ message: "Получена поръчка не може да бъде изтрита." });
    }

    await SupplierOrder.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  })
);

export default router;