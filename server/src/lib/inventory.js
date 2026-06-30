import { InventoryItem } from "../models/InventoryItem.js";
import { StockMovement } from "../models/StockMovement.js";

function toNumber(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveMovementType(quantityDelta, explicitType) {
  if (explicitType) return explicitType;
  if (quantityDelta > 0) return "in";
  if (quantityDelta < 0) return "out";
  return "adjustment";
}

export async function logStockMovement({
  productId,
  storeId,
  quantityBefore,
  quantityAfter,
  quantityDelta,
  movementType,
  sourceModule,
  sourceDocumentId,
  reason,
  actorUser,
  actorName
}) {
  if (!productId || !storeId) return null;

  return StockMovement.create({
    product: productId,
    store: storeId,
    quantityBefore: Math.max(0, toNumber(quantityBefore, 0)),
    quantityAfter: Math.max(0, toNumber(quantityAfter, 0)),
    quantityDelta: toNumber(quantityDelta, 0),
    movementType: resolveMovementType(toNumber(quantityDelta, 0), movementType),
    sourceModule: sourceModule || "system",
    sourceDocumentId: sourceDocumentId ? String(sourceDocumentId) : undefined,
    reason: reason ? String(reason) : undefined,
    actorUser,
    actorName
  });
}

export async function applyInventoryDelta({ productId, storeId, quantityDelta, reorderLevel, movement }) {
  const item =
    (await InventoryItem.findOne({ product: productId, store: storeId })) ||
    new InventoryItem({
      product: productId,
      store: storeId,
      quantity: 0,
      reserved: 0,
      reorderLevel: reorderLevel ?? 5
    });

  const quantityBefore = Number(item.quantity || 0);
  const nextQuantity = quantityBefore + Number(quantityDelta || 0);

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

  if (Number(quantityDelta || 0) !== 0 && !movement?.skipLog) {
    await logStockMovement({
      productId,
      storeId,
      quantityBefore,
      quantityAfter: nextQuantity,
      quantityDelta,
      movementType: movement?.movementType,
      sourceModule: movement?.sourceModule,
      sourceDocumentId: movement?.sourceDocumentId,
      reason: movement?.reason,
      actorUser: movement?.actorUser,
      actorName: movement?.actorName
    });
  }

  return item;
}
