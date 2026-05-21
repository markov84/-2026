import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    productNumber: { type: String, trim: true },
    barcode: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    vatRate: { type: Number, default: 20 },
    isActive: { type: Boolean, default: true },
    lowStockThreshold: { type: Number, default: 5, min: 0 }
  },
  { timestamps: true }
);

productSchema.index(
  { productNumber: 1 },
  {
    unique: true,
    sparse: true
  }
);

productSchema.index(
  { barcode: 1 },
  {
    unique: true,
    sparse: true
  }
);

export const Product = mongoose.model("Product", productSchema);

const categorySkuPrefixes = [
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

function getSkuPrefixForCategory(category) {
  const normalized = String(category || "").trim().toLowerCase().normalize("NFC");
  const match = categorySkuPrefixes.find((item) =>
    item.matches.some((categoryMatch) => normalized.includes(categoryMatch))
  );

  return match?.prefix || "0";
}

async function getNextSku(category, excludedIds = []) {
  const prefix = getSkuPrefixForCategory(category);
  const products = await Product.find({ sku: new RegExp(`^(?:SKU-)?${prefix}-\\d+$`) }).select("sku").lean();
  const excluded = new Set(excludedIds.map((id) => String(id)));
  const maxNumber = products.reduce((max, product) => {
    if (excluded.has(String(product._id))) return max;
    const number = Number(String(product.sku || "").split("-").at(-1));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);

  return `SKU-${prefix}-${String(maxNumber + 1).padStart(4, "0")}`;
}

async function repairDuplicateProductSkus() {
  const duplicateGroups = await Product.aggregate([
    { $match: { sku: { $type: "string", $ne: "" } } },
    { $group: { _id: "$sku", ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  for (const group of duplicateGroups) {
    const products = await Product.find({ _id: { $in: group.ids } }).sort({ createdAt: 1, _id: 1 });
    for (const product of products.slice(1)) {
      product.sku = await getNextSku(product.category, [product._id]);
      await product.save();
    }
  }
}

export async function ensureProductIndexes() {
  const indexes = await Product.collection.indexes();
  const barcodeIndex = indexes.find((index) => index.key?.barcode === 1);

  if (barcodeIndex && (!barcodeIndex.unique || !barcodeIndex.sparse)) {
    await Product.collection.dropIndex(barcodeIndex.name);
  }

  await repairDuplicateProductSkus();
  await Product.collection.updateMany({ barcode: "" }, { $unset: { barcode: "" } });
  await Product.collection.updateMany({ productNumber: "" }, { $unset: { productNumber: "" } });
  await Product.collection.createIndex({ sku: 1 }, { name: "sku_1", unique: true });
  await Product.collection.createIndex({ productNumber: 1 }, { name: "productNumber_1", unique: true, sparse: true });
  await Product.collection.createIndex({ barcode: 1 }, { name: "barcode_1", unique: true, sparse: true });
}
