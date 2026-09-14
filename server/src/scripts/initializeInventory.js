import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";

try {
  await connectDb();

  const [products, stores, existingItems] = await Promise.all([
    Product.find({}).select("_id lowStockThreshold").lean(),
    Store.find({}).select("_id").lean(),
    InventoryItem.find({}).select("product store").lean()
  ]);

  const existingKeys = new Set(existingItems.map((item) => `${item.product}:${item.store}`));
  const missingItems = [];

  for (const product of products) {
    for (const store of stores) {
      const key = `${product._id}:${store._id}`;
      if (existingKeys.has(key)) continue;

      missingItems.push({
        product: product._id,
        store: store._id,
        quantity: 0,
        reserved: 0,
        reorderLevel: Number(product.lowStockThreshold ?? 5)
      });
    }
  }

  if (missingItems.length) {
    await InventoryItem.insertMany(missingItems, { ordered: true });
  }

  console.log(JSON.stringify({
    products: products.length,
    stores: stores.length,
    existingInventoryItems: existingItems.length,
    createdInventoryItems: missingItems.length
  }, null, 2));
} finally {
  await mongoose.disconnect();
}