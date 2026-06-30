import mongoose from "mongoose";

const inventoryAuditLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    expectedQuantity: { type: Number, default: 0, min: 0 },
    countedQuantity: { type: Number, default: 0, min: 0 },
    reasonCode: {
      type: String,
      enum: ["missing", "damage", "wrong-transfer", "counting-error", "other"],
      default: "other"
    },
    needsRecount: { type: Boolean, default: false },
    recountCount: { type: Number, default: 0, min: 0 },
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
    recountThresholdPercent: { type: Number, default: 5, min: 0, max: 100 },
    recountThresholdUnits: { type: Number, default: 3, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewRequestedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
    lines: [inventoryAuditLineSchema]
  },
  { timestamps: true }
);

inventoryAuditSchema.index({ store: 1, status: 1, updatedAt: -1 });

export const InventoryAudit = mongoose.model("InventoryAudit", inventoryAuditSchema);
