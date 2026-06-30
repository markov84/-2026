import mongoose from "mongoose";

const inventoryAuditLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    expectedQuantity: { type: Number, default: 0, min: 0 },
    countedQuantity: { type: Number, default: 0, min: 0 },
    note: { type: String, trim: true },
    scannedAt: { type: Date },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { _id: false }
);

const inventoryAuditSchema = new mongoose.Schema(
  {
    auditNumber: { type: String, required: true, unique: true, trim: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    zone: { type: String, trim: true, default: "Обща зона" },
    blindMode: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["draft", "counting", "review", "completed", "cancelled"],
      default: "draft"
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
    lines: [inventoryAuditLineSchema]
  },
  { timestamps: true }
);

inventoryAuditSchema.index({ store: 1, status: 1, updatedAt: -1 });

export const InventoryAudit = mongoose.model("InventoryAudit", inventoryAuditSchema);
