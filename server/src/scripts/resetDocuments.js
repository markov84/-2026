import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { AuditLog } from "../models/AuditLog.js";
import { Counter } from "../models/Counter.js";
import { FinancialEntry } from "../models/FinancialEntry.js";
import { InventoryAudit } from "../models/InventoryAudit.js";
import { Invoice } from "../models/Invoice.js";
import { Order } from "../models/Order.js";
import { StockMovement } from "../models/StockMovement.js";
import { StoreTransfer } from "../models/StoreTransfer.js";
import { SupplierOrder } from "../models/SupplierOrder.js";

const documentModels = [
  ["orders", Order],
  ["invoices", Invoice],
  ["supplierOrders", SupplierOrder],
  ["transfers", StoreTransfer],
  ["financialEntries", FinancialEntry],
  ["inventoryAudits", InventoryAudit],
  ["stockMovements", StockMovement],
  ["auditLogs", AuditLog]
];

try {
  await connectDb();

  const deleted = {};
  for (const [name, model] of documentModels) {
    const result = await model.deleteMany({});
    deleted[name] = result.deletedCount;
  }

  const counterResult = await Counter.deleteMany({});
  console.log(JSON.stringify({ deleted, counters: counterResult.deletedCount }, null, 2));
} finally {
  await mongoose.disconnect();
}