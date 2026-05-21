import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { Customer } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { FinancialEntry } from "../models/FinancialEntry.js";
import { AuditLog } from "../models/AuditLog.js";

const router = Router();

router.use(requireAuth);

const severityLabels = {
  info: "Информация",
  warning: "Предупреждение",
  critical: "Критично"
};

router.get("/", async (req, res) => {
  const [productCount, storeCount, customerCount, orderCount, inventoryItems, recentOrders, financeEntries, auditLogs] =
    await Promise.all([
      Product.countDocuments(),
      Store.countDocuments(),
      Customer.countDocuments(),
      Order.countDocuments(),
      InventoryItem.find().populate("product", "name sku lowStockThreshold").populate("store", "name").lean(),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("store", "name city")
        .populate("customer", "customerType fullName company")
        .lean(),
      FinancialEntry.find().sort({ entryDate: -1, createdAt: -1 }).limit(10).populate("store", "name").lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(8).lean()
    ]);

  const lowStockItems = inventoryItems.filter(
    (item) => item.quantity <= Math.max(item.reorderLevel, item.product?.lowStockThreshold ?? 0)
  );

  const totalRevenue = financeEntries
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = financeEntries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const bankBalance = financeEntries
    .filter((entry) => entry.type === "bank")
    .reduce((sum, entry) => sum + entry.amount, 0);

  return res.json({
    stats: [
      { label: "Активни продукти", value: productCount, accent: "primary", trend: `Общо ${productCount}` },
      { label: "Магазини", value: storeCount, accent: "secondary", trend: `${storeCount} активни обекта` },
      { label: "Клиенти", value: customerCount, accent: "success", trend: `Регистрирани ${customerCount}` },
      { label: "Ниски наличности", value: lowStockItems.length, accent: "danger", trend: `${lowStockItems.length} предупреждения` }
    ],
    revenueSeries: [
      { name: "Пон", revenue: 3200 },
      { name: "Вто", revenue: 4100 },
      { name: "Сря", revenue: 3900 },
      { name: "Чет", revenue: 5200 },
      { name: "Пет", revenue: 6100 },
      { name: "Съб", revenue: 4600 },
      { name: "Нед", revenue: 3500 }
    ],
    categoryShare: [
      { name: "Висящи", value: 35 },
      { name: "Стенни", value: 20 },
      { name: "Пана", value: 18 },
      { name: "Спотове", value: 27 }
    ],
    totals: {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      bankBalance,
      orderCount,
      lowStockCount: lowStockItems.length
    },
    recentOrders,
    recentLowStock: lowStockItems.slice(0, 5).map((item) => ({
      id: item._id.toString(),
      productName: item.product?.name || "Неизвестен продукт",
      sku: item.product?.sku || "",
      storeName: item.store?.name || "Неизвестен магазин",
      quantity: item.quantity,
      reorderLevel: item.reorderLevel
    })),
    financeEntries: financeEntries.slice(0, 6),
    activity: auditLogs.map((item) => ({
      ...item,
      severityLabel: severityLabels[item.severity] || severityLabels.info
    }))
  });
});

export default router;
