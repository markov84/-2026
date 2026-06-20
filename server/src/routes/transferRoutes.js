import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { StoreTransfer } from "../models/StoreTransfer.js";
import { Store } from "../models/Store.js";
import { Product } from "../models/Product.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { applyInventoryDelta } from "../lib/inventory.js";
import { getNextDocumentNumber } from "../lib/documentNumbers.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { clearCachedJson } from "../lib/routeCache.js";

const router = Router();

router.use(requireAuth);

async function getNextTransferNumber() {
  return getNextDocumentNumber({
    model: StoreTransfer,
    field: "transferNumber",
    counterKey: "transfer",
    prefix: "TR"
  });
}

router.get("/", asyncHandler(async (req, res) => {
  const transfers = await StoreTransfer.find()
    .sort({ createdAt: -1 })
    .populate("fromStore", "name city")
    .populate("toStore", "name city")
    .populate("items.product", "name sku imageUrl price vatRate")
    .lean();

  return res.json(transfers);
}));

router.post(
  "/",
  [
    body("transferNumber").optional().trim().notEmpty(),
    body("fromStore").notEmpty(),
    body("toStore").notEmpty(),
    body("items").isArray({ min: 1 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid transfer payload.", errors: errors.array() });
    }

    if (req.body.fromStore === req.body.toStore) {
      return res.status(400).json({ message: "Source and destination store must be different." });
    }

    const [fromStoreExists, toStoreExists] = await Promise.all([
      Store.exists({ _id: req.body.fromStore }),
      Store.exists({ _id: req.body.toStore })
    ]);

    if (!fromStoreExists || !toStoreExists) {
      return res.status(404).json({ message: "Store not found." });
    }

    const productIds = [...new Set(req.body.items.map((item) => String(item.product)))];
    const productCount = await Product.countDocuments({ _id: { $in: productIds } });
    if (productCount !== productIds.length) {
      return res.status(404).json({ message: "One or more products were not found." });
    }

    for (const item of req.body.items) {
      await applyInventoryDelta({
        productId: item.product,
        storeId: req.body.fromStore,
        quantityDelta: -Number(item.quantity || 0)
      });
      await applyInventoryDelta({
        productId: item.product,
        storeId: req.body.toStore,
        quantityDelta: Number(item.quantity || 0)
      });
    }

    clearCachedJson("inventory:");

    const transfer = await StoreTransfer.create({
      ...req.body,
      transferNumber: req.body.transferNumber?.trim() || (await getNextTransferNumber())
    });
    const populated = await StoreTransfer.findById(transfer._id)
      .populate("fromStore", "name city")
      .populate("toStore", "name city")
      .populate("items.product", "name sku imageUrl price vatRate")
      .lean();

    return res.status(201).json(populated);
  })
);

router.put(
  "/:id",
  [
    body("transferNumber").optional().trim().notEmpty(),
    body("fromStore").optional().notEmpty(),
    body("toStore").optional().notEmpty(),
    body("items").optional().isArray({ min: 1 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid transfer payload.", errors: errors.array() });
    }

    const existingTransfer = await StoreTransfer.findById(req.params.id).lean();
    if (!existingTransfer) {
      return res.status(404).json({ message: "Transfer not found." });
    }

    const nextFromStore = req.body.fromStore || String(existingTransfer.fromStore);
    const nextToStore = req.body.toStore || String(existingTransfer.toStore);
    const nextItems = req.body.items || existingTransfer.items;

    if (nextFromStore === nextToStore) {
      return res.status(400).json({ message: "Source and destination store must be different." });
    }

    const [fromStoreExists, toStoreExists] = await Promise.all([
      Store.exists({ _id: nextFromStore }),
      Store.exists({ _id: nextToStore })
    ]);

    if (!fromStoreExists || !toStoreExists) {
      return res.status(404).json({ message: "Store not found." });
    }

    const productIds = [...new Set(nextItems.map((item) => String(item.product)))];
    const productCount = await Product.countDocuments({ _id: { $in: productIds } });
    if (productCount !== productIds.length) {
      return res.status(404).json({ message: "One or more products were not found." });
    }

    for (const item of existingTransfer.items) {
      await applyInventoryDelta({
        productId: item.product,
        storeId: existingTransfer.fromStore,
        quantityDelta: Number(item.quantity || 0)
      });
      await applyInventoryDelta({
        productId: item.product,
        storeId: existingTransfer.toStore,
        quantityDelta: -Number(item.quantity || 0)
      });
    }

    for (const item of nextItems) {
      await applyInventoryDelta({
        productId: item.product,
        storeId: nextFromStore,
        quantityDelta: -Number(item.quantity || 0)
      });
      await applyInventoryDelta({
        productId: item.product,
        storeId: nextToStore,
        quantityDelta: Number(item.quantity || 0)
      });
    }

    const transfer = await StoreTransfer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, fromStore: nextFromStore, toStore: nextToStore, items: nextItems },
      { new: true, runValidators: true }
    )
      .populate("fromStore", "name city")
      .populate("toStore", "name city")
      .populate("items.product", "name sku imageUrl price vatRate")
      .lean();

    clearCachedJson("inventory:");

    return res.json(transfer);
  })
);

router.delete("/:id", asyncHandler(async (req, res) => {
  const transfer = await StoreTransfer.findById(req.params.id).lean();
  if (!transfer) {
    return res.status(404).json({ message: "Transfer not found." });
  }

  let canReverseInventory = true;

  for (const item of transfer.items) {
    const inventoryItem = await InventoryItem.findOne({
      product: item.product,
      store: transfer.toStore
    }).lean();
    const availableQuantity = Number(inventoryItem?.quantity || 0);
    const transferQuantity = Number(item.quantity || 0);

    if (availableQuantity < transferQuantity) {
      canReverseInventory = false;
      break;
    }
  }

  if (canReverseInventory) {
    for (const item of transfer.items) {
      await applyInventoryDelta({
        productId: item.product,
        storeId: transfer.fromStore,
        quantityDelta: Number(item.quantity || 0)
      });
      await applyInventoryDelta({
        productId: item.product,
        storeId: transfer.toStore,
        quantityDelta: -Number(item.quantity || 0)
      });
    }

    clearCachedJson("inventory:");
  }

  await StoreTransfer.findByIdAndDelete(req.params.id);
  return res.status(204).send();
}));

export default router;
