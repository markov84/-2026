import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    unit: { type: String, default: "бр.", trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    vatRate: { type: Number, default: 20, min: 0 }
  },
  { _id: false }
);

const invoiceSupplierSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    idNumber: { type: String, trim: true },
    vatNumber: { type: String, trim: true },
    manager: { type: String, trim: true },
    bank: { type: String, trim: true },
    iban: { type: String, trim: true }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    supplier: {
      type: invoiceSupplierSchema,
      default: () => ({
        name: "MARK LIGHT LTD",
        address: "Габрово, ул. Пенчо Постомпиров 35",
        idNumber: "200288095",
        manager: "инж. Антон Марков"
      })
    },
    customerName: { type: String, required: true, trim: true },
    customerAddress: { type: String, trim: true },
    customerIdNumber: { type: String, trim: true },
    customerVatNumber: { type: String, trim: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    items: { type: [invoiceItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    vatAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["draft", "issued", "paid", "cancelled"],
      default: "issued"
    },
    issueDate: { type: Date, default: Date.now },
    taxEventDate: { type: Date },
    paymentMethod: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);
