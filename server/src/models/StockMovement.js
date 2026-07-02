import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    quantityBefore: { type: Number, required: true, min: 0 },
    quantityAfter: { type: Number, required: true, min: 0 },
    quantityDelta: { type: Number, required: true },
    movementType: {
      type: String,
      enum: ["in", "out", "adjustment"],
      required: true
    },
    sourceModule: {
      type: String,
      enum: ["inventory", "order", "transfer", "audit", "product", "supplier-order", "system"],
      default: "system"
    },
    sourceDocumentId: { type: String, trim: true },
    reason: { type: String, trim: true },
    actorUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, trim: true }
  },
  { timestamps: true }
);

stockMovementSchema.index({ store: 1, createdAt: -1 });
stockMovementSchema.index({ product: 1, createdAt: -1 });

export const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
