import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { Invoice } from "../models/Invoice.js";
import { Store } from "../models/Store.js";
import { getNextDocumentNumber } from "../lib/documentNumbers.js";

const router = Router();

router.use(requireAuth);

async function getNextInvoiceNumber() {
  return getNextDocumentNumber({
    model: Invoice,
    field: "invoiceNumber",
    counterKey: "invoice",
    prefix: "INV"
  });
}

router.get("/", async (req, res) => {
  const invoices = await Invoice.find().sort({ issueDate: -1, createdAt: -1 }).populate("store", "name city").lean();
  return res.json(invoices);
});

router.get("/vat-report", async (req, res) => {
  const invoices = await Invoice.find().lean();
  const issued = invoices.filter((invoice) => invoice.status !== "cancelled");

  const subtotal = issued.reduce((sum, invoice) => sum + invoice.subtotal, 0);
  const vatAmount = issued.reduce((sum, invoice) => sum + invoice.vatAmount, 0);
  const totalAmount = issued.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  const monthlyBreakdown = issued.reduce((acc, invoice) => {
    const month = new Date(invoice.issueDate).toISOString().slice(0, 7);
    if (!acc[month]) {
      acc[month] = { month, subtotal: 0, vatAmount: 0, totalAmount: 0, count: 0 };
    }
    acc[month].subtotal += invoice.subtotal;
    acc[month].vatAmount += invoice.vatAmount;
    acc[month].totalAmount += invoice.totalAmount;
    acc[month].count += 1;
    return acc;
  }, {});

  return res.json({
    summary: {
      subtotal,
      vatAmount,
      totalAmount,
      invoiceCount: issued.length
    },
    monthlyBreakdown: Object.values(monthlyBreakdown).sort((a, b) => a.month.localeCompare(b.month))
  });
});

router.post(
  "/",
  [
    body("invoiceNumber").optional().trim().notEmpty(),
    body("supplier.name").optional({ values: "falsy" }).trim(),
    body("supplier.address").optional({ values: "falsy" }).trim(),
    body("supplier.idNumber").optional({ values: "falsy" }).trim(),
    body("supplier.vatNumber").optional({ values: "falsy" }).trim(),
    body("supplier.manager").optional({ values: "falsy" }).trim(),
    body("supplier.bank").optional({ values: "falsy" }).trim(),
    body("supplier.iban").optional({ values: "falsy" }).trim(),
    body("customerName").trim().notEmpty(),
    body("customerAddress").optional({ values: "falsy" }).trim(),
    body("customerIdNumber").optional({ values: "falsy" }).trim(),
    body("customerVatNumber").optional({ values: "falsy" }).trim(),
    body("issueDate").optional({ values: "falsy" }).isISO8601(),
    body("taxEventDate").optional({ values: "falsy" }).isISO8601(),
    body("items").isArray({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid invoice payload.", errors: errors.array() });
    }

    if (req.body.store) {
      const storeExists = await Store.exists({ _id: req.body.store });
      if (!storeExists) {
        return res.status(404).json({ message: "Store not found." });
      }
    }

    const subtotal =
      req.body.subtotal ??
      req.body.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const vatAmount =
      req.body.vatAmount ??
      req.body.items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0) * (Number(item.vatRate || 0) / 100),
        0
      );
    const totalAmount = req.body.totalAmount ?? subtotal + vatAmount;

    const invoice = await Invoice.create({
      ...req.body,
      invoiceNumber: req.body.invoiceNumber?.trim() || (await getNextInvoiceNumber()),
      subtotal,
      vatAmount,
      totalAmount
    });

    const populated = await Invoice.findById(invoice._id).populate("store", "name city").lean();
    return res.status(201).json(populated);
  }
);

router.put(
  "/:id",
  [
    body("invoiceNumber").optional().trim().notEmpty(),
    body("supplier.name").optional({ values: "falsy" }).trim(),
    body("supplier.address").optional({ values: "falsy" }).trim(),
    body("supplier.idNumber").optional({ values: "falsy" }).trim(),
    body("supplier.vatNumber").optional({ values: "falsy" }).trim(),
    body("supplier.manager").optional({ values: "falsy" }).trim(),
    body("supplier.bank").optional({ values: "falsy" }).trim(),
    body("supplier.iban").optional({ values: "falsy" }).trim(),
    body("customerName").optional().trim().notEmpty(),
    body("customerAddress").optional({ values: "falsy" }).trim(),
    body("customerIdNumber").optional({ values: "falsy" }).trim(),
    body("customerVatNumber").optional({ values: "falsy" }).trim(),
    body("issueDate").optional({ values: "falsy" }).isISO8601(),
    body("taxEventDate").optional({ values: "falsy" }).isISO8601(),
    body("items").optional().isArray({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid invoice payload.", errors: errors.array() });
    }

    if (req.body.store) {
      const storeExists = await Store.exists({ _id: req.body.store });
      if (!storeExists) {
        return res.status(404).json({ message: "Store not found." });
      }
    }

    const current = await Invoice.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    const items = req.body.items ?? current.items;
    const subtotal =
      req.body.subtotal ??
      items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const vatAmount =
      req.body.vatAmount ??
      items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0) * (Number(item.vatRate || 0) / 100),
        0
      );
    const totalAmount = req.body.totalAmount ?? subtotal + vatAmount;

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { ...req.body, subtotal, vatAmount, totalAmount },
      { new: true, runValidators: true }
    )
      .populate("store", "name city")
      .lean();

    return res.json(invoice);
  }
);

router.delete("/:id", async (req, res) => {
  const invoice = await Invoice.findByIdAndDelete(req.params.id);

  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found." });
  }

  return res.status(204).send();
});

export default router;
