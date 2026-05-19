import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { Counter } from "../models/Counter.js";
import { applyInventoryDelta } from "../lib/inventory.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.use(requireAuth);

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
      .populate("customer", "fullName company")
      .populate("createdBy", "fullName username")
      .populate("items.product", "name sku imageUrl price")
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

    const productIds = req.body.items.map((item) => item.product);
    const productCount = await Product.countDocuments({ _id: { $in: productIds } });
    if (productCount !== productIds.length) {
      return res.status(404).json({ message: "One or more products were not found." });
    }

    const totalAmount =
      req.body.totalAmount ??
      req.body.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

    let order;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        order = await Order.create({
          ...req.body,
          createdBy: req.user._id,
          orderNumber: req.body.orderNumber?.trim() || (await getNextOrderNumber()),
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

    const populated = await Order.findById(order._id)
      .populate("store", "name city")
      .populate("customer", "fullName company")
      .populate("createdBy", "fullName username")
      .populate("items.product", "name sku imageUrl price")
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

    const productIds = nextItems.map((item) => item.product);
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

    const totalAmount =
      req.body.totalAmount ??
      nextItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { ...req.body, store: nextStoreId, items: nextItems, totalAmount },
      { new: true, runValidators: true }
    )
      .populate("store", "name city")
      .populate("customer", "fullName company")
      .populate("createdBy", "fullName username")
      .populate("items.product", "name sku imageUrl price")
      .lean();

    return res.json(order);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    for (const item of order.items) {
      await applyInventoryDelta({
        productId: item.product,
        storeId: order.store,
        quantityDelta: Number(item.quantity || 0)
      });
    }

    await Order.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  })
);

export default router;
