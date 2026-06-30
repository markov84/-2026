import { Router } from "express";
import { body, validationResult } from "express-validator";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { requireAuth } from "../middleware/auth.js";
import { applyInventoryDelta } from "../lib/inventory.js";
import { clearCachedJson, getCachedJson, setCachedJson } from "../lib/routeCache.js";

const router = Router();

router.use(requireAuth);

const CATEGORY_SKU_PREFIXES = [
  { prefix: "1", matches: ["полилей", "полилеи", "pendant", "chandelier"] },
  { prefix: "2", matches: ["плафон", "плафони", "ceiling"] },
  { prefix: "3", matches: ["аплик", "аплици", "wall"] },
  { prefix: "4", matches: ["спот", "луна", "spot"] },
  { prefix: "5", matches: ["панел", "панели", "panel"] },
  { prefix: "6", matches: ["лампион", "подова", "floor"] },
  { prefix: "7", matches: ["настолна", "настолни", "table"] },
  { prefix: "8", matches: ["лента", "ленти", "strip"] },
  { prefix: "9", matches: ["крушка", "крушки", "bulb"] }
];

const CATEGORY_SKU_PREFIXES_FIXED = [
  { prefix: "1", matches: ["\u043f\u043e\u043b\u0438\u043b\u0435\u0439", "\u043f\u043e\u043b\u0438\u043b\u0435\u0438", "pendant", "chandelier"] },
  { prefix: "2", matches: ["\u043f\u043b\u0430\u0444\u043e\u043d", "\u043f\u043b\u0430\u0444\u043e\u043d\u0438", "ceiling"] },
  { prefix: "3", matches: ["\u0430\u043f\u043b\u0438\u043a", "\u0430\u043f\u043b\u0438\u0446\u0438", "wall"] },
  { prefix: "4", matches: ["\u0441\u043f\u043e\u0442", "\u043b\u0443\u043d\u0430", "spot"] },
  { prefix: "5", matches: ["\u043f\u0430\u043d\u0435\u043b", "\u043f\u0430\u043d\u0435\u043b\u0438", "panel"] },
  { prefix: "6", matches: ["\u043b\u0430\u043c\u043f\u0438\u043e\u043d", "\u043f\u043e\u0434\u043e\u0432\u0430", "floor"] },
  { prefix: "7", matches: ["\u043d\u0430\u0441\u0442\u043e\u043b\u043d\u0430", "\u043d\u0430\u0441\u0442\u043e\u043b\u043d\u0438", "table"] },
  { prefix: "8", matches: ["\u043b\u0435\u043d\u0442\u0430", "\u043b\u0435\u043d\u0442\u0438", "strip"] },
  { prefix: "9", matches: ["\u043a\u0440\u0443\u0448\u043a\u0430", "\u043a\u0440\u0443\u0448\u043a\u0438", "bulb"] }
];

function normalizeOptionalString(value) {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getDuplicateProductMessage(error) {
  if (error?.keyPattern?.productNumber || error?.keyValue?.productNumber !== undefined) {
    return "A product with this product number already exists.";
  }

  if (error?.keyPattern?.barcode || error?.keyValue?.barcode !== undefined) {
    return "A product with this barcode already exists.";
  }

  return "A product with this SKU already exists.";
}

function removeUndefinedFields(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSkuPrefixForCategory(category) {
  const normalized = String(category || "").trim().toLowerCase().normalize("NFC");
  const match = CATEGORY_SKU_PREFIXES_FIXED.find((item) =>
    item.matches.some((categoryMatch) => normalized.includes(categoryMatch))
  );

  return match?.prefix || "0";
}

async function generateSkuForCategory(category) {
  const prefix = getSkuPrefixForCategory(category);
  const products = await Product.find({ sku: new RegExp(`^(?:SKU-)?${escapeRegExp(prefix)}-\\d+$`) })
    .select("sku")
    .lean();
  const nextNumber =
    products.reduce((max, product) => {
      const number = Number(String(product.sku || "").split("-").at(-1));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0) + 1;

  return `SKU-${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

async function createProductWithUniqueSku(payload, { manualSku = false } = {}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await Product.create(payload);
    } catch (error) {
      if (manualSku || error?.code !== 11000 || !error?.keyPattern?.sku) {
        throw error;
      }

      payload.sku = await generateSkuForCategory(payload.category);
    }
  }

  return Product.create(payload);
}

router.get("/", async (req, res) => {
  const search = req.query.search?.trim();
  const compact = req.query.compact === "1" || req.query.compact === "true";
  const cacheKey = `products:${compact ? "compact" : "full"}:${search || ""}`;
  const cachedProducts = getCachedJson(cacheKey);
  if (cachedProducts) {
    return res.json(cachedProducts);
  }

  const filter = search
    ? {
        $or: [
          { name: new RegExp(search, "i") },
          { productNumber: new RegExp(search, "i") },
          { sku: new RegExp(search, "i") },
          { barcode: new RegExp(search, "i") }
        ]
      }
    : {};

  const products = await Product.find(filter)
    .select(
      compact
        ? "name productNumber sku barcode category brand price lowStockThreshold isActive"
        : "name productNumber sku barcode category brand description price cost vatRate isActive lowStockThreshold createdAt updatedAt"
    )
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  setCachedJson(cacheKey, products);
  return res.json(products);
});

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  return res.json(product);
});

router.get("/:id/image", async (req, res) => {
  const product = await Product.findById(req.params.id).select("imageUrl").lean();
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  return res.json({ imageUrl: product.imageUrl || "" });
});

router.post(
  "/",
  [
    body("name").trim().notEmpty(),
    body("productNumber").optional({ values: "falsy" }).trim(),
    body("sku").optional({ values: "falsy" }).trim(),
    body("barcode").optional({ values: "falsy" }).trim(),
    body("category").optional({ values: "falsy" }).trim(),
    body("price").isFloat({ min: 0 }),
    body("initialQuantity").optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid product payload.", errors: errors.array() });
    }

    if (Number(req.body.initialQuantity || 0) > 0 && !req.body.initialStore) {
      return res.status(400).json({ message: "Initial store is required when initial quantity is set." });
    }

    if (req.body.initialStore) {
      const storeExists = await Store.exists({ _id: req.body.initialStore });
      if (!storeExists) {
        return res.status(404).json({ message: "Initial store not found." });
      }
    }

    const category = req.body.category?.trim() || "General";
    const manualSku = req.body.sku?.trim();
    const generatedSku = manualSku || (await generateSkuForCategory(category));
    const payload = {
      ...req.body,
      sku: generatedSku,
      productNumber: normalizeOptionalString(req.body.productNumber),
      barcode: normalizeOptionalString(req.body.barcode),
      brand: normalizeOptionalString(req.body.brand),
      description: normalizeOptionalString(req.body.description),
      imageUrl: normalizeOptionalString(req.body.imageUrl),
      category
    };
    delete payload.initialStore;
    delete payload.initialQuantity;

    try {
      const product = await createProductWithUniqueSku(payload, { manualSku: Boolean(manualSku) });

      if (Number(req.body.initialQuantity || 0) > 0 && req.body.initialStore) {
        await applyInventoryDelta({
          productId: product._id,
          storeId: req.body.initialStore,
          quantityDelta: Number(req.body.initialQuantity || 0),
          reorderLevel: Number(req.body.lowStockThreshold ?? 5),
          movement: {
            sourceModule: "product",
            sourceDocumentId: product._id,
            reason: "Начална наличност при създаване на продукт",
            actorUser: req.user?._id,
            actorName: req.user?.fullName || req.user?.username
          }
        });
        clearCachedJson("inventory:");
      }

      clearCachedJson("products:");
      return res.status(201).json(product);
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ message: getDuplicateProductMessage(error) });
      }

      throw error;
    }
  }
);

router.put(
  "/:id",
  [
    body("name").optional().trim().notEmpty(),
    body("productNumber").optional({ values: "falsy" }).trim(),
    body("sku").optional({ values: "falsy" }).trim(),
    body("barcode").optional({ values: "falsy" }).trim(),
    body("category").optional({ values: "falsy" }).trim(),
    body("price").optional().isFloat({ min: 0 }),
    body("cost").optional().isFloat({ min: 0 }),
    body("lowStockThreshold").optional().isInt({ min: 0 }),
    body("vatRate").optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid product payload.", errors: errors.array() });
    }

    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    const sku = req.body.sku?.trim() || existingProduct.sku;
    const payload = removeUndefinedFields({
      ...req.body,
      sku,
      productNumber: normalizeOptionalString(req.body.productNumber),
      barcode: normalizeOptionalString(req.body.barcode),
      brand: normalizeOptionalString(req.body.brand),
      description: normalizeOptionalString(req.body.description),
      imageUrl: normalizeOptionalString(req.body.imageUrl),
      category: req.body.category?.trim() || existingProduct.category || "General"
    });
    const update = {
      $set: payload,
      $unset: {
        ...(Object.prototype.hasOwnProperty.call(req.body, "productNumber") && payload.productNumber === undefined ? { productNumber: "" } : {}),
        ...(Object.prototype.hasOwnProperty.call(req.body, "barcode") && payload.barcode === undefined ? { barcode: "" } : {})
      }
    };
    if (!Object.keys(update.$unset).length) delete update.$unset;

    try {
      const product = await Product.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true
      });

      clearCachedJson("products:");
      clearCachedJson("inventory:");
      return res.json(product);
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ message: getDuplicateProductMessage(error) });
      }

      throw error;
    }
  }
);

router.delete("/:id", async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  clearCachedJson("products:");
  clearCachedJson("inventory:");
  return res.status(204).send();
});

export default router;
