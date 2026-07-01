import mongoose from "mongoose";

const supplierOrderSupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    vatNumber: { type: String, trim: true }
  },
  { _id: false }
);

const supplierOrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const supplierOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    supplier: { type: supplierOrderSupplierSchema, required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    items: { type: [supplierOrderItemSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "sent", "received", "cancelled"],
      default: "draft"
    },
    requestedBy: { type: String, trim: true },
    expectedDate: { type: Date },
    orderedAt: { type: Date, default: Date.now },
    receivedAt: { type: Date },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

export const SupplierOrder = mongoose.model("SupplierOrder", supplierOrderSchema);