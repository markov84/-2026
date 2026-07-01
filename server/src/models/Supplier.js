import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    vatNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Supplier = mongoose.model("Supplier", supplierSchema);