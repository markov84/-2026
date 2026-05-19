import mongoose from "mongoose";

const transferItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const storeTransferSchema = new mongoose.Schema(
  {
    transferNumber: { type: String, required: true, unique: true, trim: true },
    fromStore: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    toStore: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    items: { type: [transferItemSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "pending", "in_transit", "completed", "cancelled"],
      default: "pending"
    },
    requestedBy: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

export const StoreTransfer = mongoose.model("StoreTransfer", storeTransferSchema);
