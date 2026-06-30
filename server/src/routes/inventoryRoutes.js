import { Router } from "express";
import { body, validationResult } from "express-validator";
import { InventoryItem } from "../models/InventoryItem.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { requireAuth } from "../middleware/auth.js";
import { applyInventoryDelta } from "../lib/inventory.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { clearCachedJson, getCachedJson, setCachedJson } from "../lib/routeCache.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", asyncHandler(async (req, res) => {
  const cachedSummary = getCachedJson("inventory:summary");
  if (cachedSummary) {
    return res.json(cachedSummary);
  }

  const items = await InventoryItem.aggregate([
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              name: 1,
              sku: 1,
              lowStockThreshold: 1,
              category: 1,
              brand: 1,
              price: 1
            }
          }
        ],
        as: "product"
      }
    },
    {
      $lookup: {
        from: "stores",
        localField: "store",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, city: 1 } }],
        as: "store"
      }
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
    { $sort: { updatedAt: -1, _id: -1 } }
  ]);

  const summary = items.map((item) => ({
    ...item,
    isLowStock: item.quantity <= Math.max(item.reorderLevel, item.product?.lowStockThreshold ?? 0)
  }));

  setCachedJson("inventory:summary", summary);
  return res.json(summary);
}));

router.post(
  "/summary",
  [
    body("product").notEmpty(),
    body("store").notEmpty(),
    body("quantity").isInt({ min: 0 }),
    body("mode").optional().isIn(["increment", "replace"])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid inventory payload.", errors: errors.array() });
    }

    const [productExists, storeExists] = await Promise.all([
      Product.exists({ _id: req.body.product }),
      Store.exists({ _id: req.body.store })
    ]);

    if (!productExists) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (!storeExists) {
      return res.status(404).json({ message: "Store not found." });
    }

    const existing = await InventoryItem.findOne({ product: req.body.product, store: req.body.store });
    const mode = req.body.mode || "increment";
    const quantity = Number(req.body.quantity || 0);
    const reorderLevel = Number(req.body.reorderLevel ?? existing?.reorderLevel ?? 5);

    let item;
    if (mode === "replace") {
      const quantityDelta = quantity - Number(existing?.quantity || 0);
      item = await applyInventoryDelta({
        productId: req.body.product,
        storeId: req.body.store,
        quantityDelta,
        reorderLevel,
        movement: {
          sourceModule: "inventory",
          movementType: "adjustment",
          reason: "Ръчна замяна на наличност",
          actorUser: req.user?._id,
          actorName: req.user?.fullName || req.user?.username
        }
      });
    } else {
      item = await applyInventoryDelta({
        productId: req.body.product,
        storeId: req.body.store,
        quantityDelta: quantity,
        reorderLevel,
        movement: {
          sourceModule: "inventory",
          reason: "Ръчно добавяне на наличност",
          actorUser: req.user?._id,
          actorName: req.user?.fullName || req.user?.username
        }
      });
    }

    clearCachedJson("inventory:");
    return res.status(201).json(item);
  })
);

router.delete("/summary/:id", asyncHandler(async (req, res) => {
  const item = await InventoryItem.findByIdAndDelete(req.params.id);

  if (!item) {
    return res.status(404).json({ message: "Inventory item not found." });
  }

  clearCachedJson("inventory:");
  return res.status(204).send();
}));

export default router;
