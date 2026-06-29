import mongoose from "mongoose";

const financialEntrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["income", "expense", "bank"],
      required: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store"
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank-transfer", "internal"],
      default: "bank-transfer"
    },
    source: {
      type: String,
      enum: ["manual", "order"],
      default: "manual"
    },
    sourceOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    entryDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export const FinancialEntry = mongoose.model("FinancialEntry", financialEntrySchema);
