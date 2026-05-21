import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customerType: { type: String, enum: ["person", "company"], default: "person" },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    vatNumber: { type: String, trim: true },
    legalAddress: { type: String, trim: true },
    loyaltyPoints: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    preferredStore: { type: mongoose.Schema.Types.ObjectId, ref: "Store" }
  },
  { timestamps: true }
);

export const Customer = mongoose.model("Customer", customerSchema);
