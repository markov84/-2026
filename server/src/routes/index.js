import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./authRoutes.js";
import customerRoutes from "./customerRoutes.js";
import dashboardRoutes from "./dashboardOverviewRoutes.js";
import employeeRoutes from "./employeeRoutes.js";
import financeRoutes from "./financeRoutes.js";
import invoiceRoutes from "./invoiceRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";
import inventoryAuditRoutes from "./inventoryAuditRoutes.js";
import inventoryMovementRoutes from "./inventoryMovementRoutes.js";
import orderRoutes from "./orderRoutes.js";
import productRoutes from "./productRoutes.js";
import storeRoutes from "./storeRoutes.js";
import transferRoutes from "./transferRoutes.js";

const router = Router();

router.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  res.status(dbState === 1 ? 200 : 503).json({
    status: "ok",
    database: dbStatusMap[dbState] || "unknown"
  });
});

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/products", productRoutes);
router.use("/customers", customerRoutes);
router.use("/stores", storeRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/inventory-audits", inventoryAuditRoutes);
router.use("/inventory-movements", inventoryMovementRoutes);
router.use("/orders", orderRoutes);
router.use("/finance", financeRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/employees", employeeRoutes);
router.use("/transfers", transferRoutes);

export default router;
