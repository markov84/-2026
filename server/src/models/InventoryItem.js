import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    quantity: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 5, min: 0 }
  },
  { timestamps: true }
);

inventoryItemSchema.index({ product: 1, store: 1 }, { unique: true });

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);
