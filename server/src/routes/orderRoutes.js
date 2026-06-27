import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { Counter } from "../models/Counter.js";
import { applyInventoryDelta } from "../lib/inventory.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { clearCachedJson } from "../lib/routeCache.js";

const router = Router();

router.use(requireAuth);

function toNumber(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeOrderItems(items = []) {
  return items.map((item) => ({
    product: item.product,
    quantity: toNumber(item.quantity, 0),
    unitPrice: toNumber(item.unitPrice, 0),
    vatRate: toNumber(item.vatRate, 20)
  }));
}

function calculateOrderTotals(items = []) {
  return items.reduce(
    (totals, item) => {
      const lineGross = toNumber(item.quantity, 0) * toNumber(item.unitPrice, 0);
      const vatRate = toNumber(item.vatRate, 20);
      const vatDivider = 1 + vatRate / 100;
      const lineBase = vatDivider > 0 ? lineGross / vatDivider : lineGross;
      const lineVat = lineGross - lineBase;
      return {
        subtotal: totals.subtotal + lineBase,
        vatAmount: totals.vatAmount + lineVat,
        totalAmount: totals.totalAmount + lineGross
      };
    },
    { subtotal: 0, vatAmount: 0, totalAmount: 0 }
  );
}

async function reserveCounter(counterValue) {
  await Counter.updateOne(
    {
      key: counterValue,
      $or: [{ name: null }, { name: { $exists: false } }]
    },
    { $set: { name: counterValue } }
  );

  return Counter.findOneAndUpdate(
    { key: counterValue },
    {
      $setOnInsert: {
        key: counterValue,
        name: counterValue
      },
      $inc: { value: 1 }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function getNextOrderNumber() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const datePart = `${month},${day},${year}`;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const counter = await reserveCounter(`order-date:${datePart}`);

  const ordersToday = await Order.find({
    createdAt: { $gte: startOfDay, $lt: endOfDay }
  })
    .select("orderNumber")
    .lean();

  const legacyDailyPattern = /^\d+$/;
  const datedPattern = new RegExp(`^(\\d+)-${month},${day},${year}$`);
  const latestExistingValue = ordersToday.reduce((max, order) => {
    const current = String(order.orderNumber || "").trim();
    const datedMatch = current.match(datedPattern);

    if (datedMatch) {
      return Math.max(max, Number(datedMatch[1]) || 0);
    }

    if (legacyDailyPattern.test(current)) {
      return Math.max(max, Number(current) || 0);
    }

    return max;
  }, 0);

  const nextValue = Math.max(Number(counter.value || 0), latestExistingValue + 1);

  if (nextValue !== counter.value) {
    counter.value = nextValue;
    await counter.save();
  }

  return `${String(nextValue).padStart(2, "0")}-${datePart}`;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("store", "name city")
      .populate("customer", "customerType fullName company")
      .populate("createdBy", "fullName username")
      .populate("items.product", "name productNumber sku barcode imageUrl price vatRate")
      .lean();

    return res.json(orders);
  })
);

router.post(
  "/",
  [body("orderNumber").optional().trim().notEmpty(), body("store").notEmpty(), body("items").isArray({ min: 1 })],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid order payload.", errors: errors.array() });
    }

    const storeExists = await Store.exists({ _id: req.body.store });
    if (!storeExists) {
      return res.status(404).json({ message: "Store not found." });
    }

    if (req.body.customer) {
      const customerExists = await Customer.exists({ _id: req.body.customer });
      if (!customerExists) {
        return res.status(404).json({ message: "Customer not found." });
      }
    }

    const productIds = Array.from(new Set(req.body.items.map((item) => String(item.product))));
    const productCount = await Product.countDocuments({ _id: { $in: productIds } });
    if (productCount !== productIds.length) {
      return res.status(404).json({ message: "One or more products were not found." });
    }

    const normalizedItems = normalizeOrderItems(req.body.items || []);
    const { subtotal, vatAmount, totalAmount } = calculateOrderTotals(normalizedItems);

    let order;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        order = await Order.create({
          ...req.body,
          items: normalizedItems,
          createdBy: req.user._id,
          orderNumber: req.body.orderNumber?.trim() || (await getNextOrderNumber()),
          subtotal,
          vatAmount,
          totalAmount
        });
        break;
      } catch (error) {
        if (error?.code !== 11000 || req.body.orderNumber?.trim() || attempt === 4) {
          throw error;
        }
      }
    }

    for (const item of req.body.items) {
      try {
        await applyInventoryDelta({
          productId: item.product,
          storeId: req.body.store,
          quantityDelta: -Number(item.quantity || 0)
        });
      } catch (error) {
        await Order.findByIdAndDelete(order._id);
        throw error;
      }
    }

    clearCachedJson("inventory:");

    const populated = await Order.findById(order._id)
      .populate("store", "name city")
      .populate("customer", "customerType fullName company")
      .populate("createdBy", "fullName username")
      .populate("items.product", "name productNumber sku barcode imageUrl price vatRate")
      .lean();

    return res.status(201).json(populated);
  })
);

router.put(
  "/:id",
  [body("orderNumber").optional().trim().notEmpty(), body("store").optional().notEmpty(), body("items").optional().isArray({ min: 1 })],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid order payload.", errors: errors.array() });
    }

    const existingOrder = await Order.findById(req.params.id).lean();
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    const nextStoreId = req.body.store || String(existingOrder.store);
    const nextItems = req.body.items || existingOrder.items;

    const storeExists = await Store.exists({ _id: nextStoreId });
    if (!storeExists) {
      return res.status(404).json({ message: "Store not found." });
    }

    if (req.body.customer) {
      const customerExists = await Customer.exists({ _id: req.body.customer });
      if (!customerExists) {
        return res.status(404).json({ message: "Customer not found." });
      }
    }

    const productIds = Array.from(new Set(nextItems.map((item) => String(item.product))));
    const productCount = await Product.countDocuments({ _id: { $in: productIds } });
    if (productCount !== productIds.length) {
      return res.status(404).json({ message: "One or more products were not found." });
    }

    for (const item of existingOrder.items) {
      await applyInventoryDelta({
        productId: item.product,
        storeId: existingOrder.store,
        quantityDelta: Number(item.quantity || 0)
      });
    }

    for (const item of nextItems) {
      await applyInventoryDelta({
        productId: item.product,
        storeId: nextStoreId,
        quantityDelta: -Number(item.quantity || 0)
      });
    }

    const normalizedItems = normalizeOrderItems(nextItems);
    const { subtotal, vatAmount, totalAmount } = calculateOrderTotals(normalizedItems);

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { ...req.body, store: nextStoreId, items: normalizedItems, subtotal, vatAmount, totalAmount },
      { new: true, runValidators: true }
    )
      .populate("store", "name city")
      .populate("customer", "customerType fullName company")
      .populate("createdBy", "fullName username")
      .populate("items.product", "name productNumber sku barcode imageUrl price vatRate")
      .lean();

    clearCachedJson("inventory:");

    return res.json(order);
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    clearCachedJson("inventory:");

    await Order.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  })
);

export default router;
