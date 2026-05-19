import { InventoryItem } from "../models/InventoryItem.js";

export async function applyInventoryDelta({ productId, storeId, quantityDelta, reorderLevel }) {
  const item =
    (await InventoryItem.findOne({ product: productId, store: storeId })) ||
    new InventoryItem({
      product: productId,
      store: storeId,
      quantity: 0,
      reserved: 0,
      reorderLevel: reorderLevel ?? 5
    });

  const nextQuantity = Number(item.quantity || 0) + Number(quantityDelta || 0);

  if (nextQuantity < 0) {
    const error = new Error("Insufficient inventory quantity.");
    error.statusCode = 400;
    throw error;
  }

  item.quantity = nextQuantity;

  if (typeof reorderLevel === "number" && Number.isFinite(reorderLevel)) {
    item.reorderLevel = reorderLevel;
  }

  await item.save();
  return item;
}
