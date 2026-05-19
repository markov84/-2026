import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, sparse: true, trim: true },
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
);

counterSchema.pre("validate", function syncLegacyName(next) {
  if (this.key && !this.name) {
    this.name = this.key;
  }

  next();
});

export const Counter = mongoose.model("Counter", counterSchema);
