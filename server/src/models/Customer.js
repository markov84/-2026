import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    loyaltyPoints: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    preferredStore: { type: mongoose.Schema.Types.ObjectId, ref: "Store" }
  },
  { timestamps: true }
);

export const Customer = mongoose.model("Customer", customerSchema);
