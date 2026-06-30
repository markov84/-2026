import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { Customer } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { FinancialEntry } from "../models/FinancialEntry.js";
import { AuditLog } from "../models/AuditLog.js";
import { InventoryAudit } from "../models/InventoryAudit.js";

const router = Router();

router.use(requireAuth);

const severityLabels = {
  info: "Информация",
  warning: "Предупреждение",
  critical: "Критично"
};

router.get("/", async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfLast30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const isAdmin = req.user?.role === "admin";

  const [
    productCount,
    storeCount,
    customerCount,
    orderCount,
    inventoryItems,
    recentOrders,
    financeEntries,
    auditLogs,
    financeTotals,
    dailyTurnoverTotals,
    monthlyTurnoverTotals,
    auditMetrics
  ] =
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
      AuditLog.find().sort({ createdAt: -1 }).limit(8).lean(),
      FinancialEntry.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $cond: [{ $eq: ["$type", "income"] }, "$amount", 0]
              }
            },
            totalExpenses: {
              $sum: {
                $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0]
              }
            },
            bankBalance: {
              $sum: {
                $cond: [{ $eq: ["$type", "bank"] }, "$amount", 0]
              }
            }
          }
        }
      ]),
      FinancialEntry.aggregate([
        {
          $match: {
            type: "income",
            entryDate: {
              $gte: startOfDay,
              $lt: startOfNextDay
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ]),
      FinancialEntry.aggregate([
        {
          $match: {
            type: "income",
            entryDate: {
              $gte: startOfMonth,
              $lt: startOfNextMonth
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ]),
      InventoryAudit.find()
        .select("status lines updatedAt completedAt")
        .lean()
    ]);

  const lowStockItems = inventoryItems.filter(
    (item) => item.quantity <= Math.max(item.reorderLevel, item.product?.lowStockThreshold ?? 0)
  );

  const totalRevenue = Number(financeTotals?.[0]?.totalRevenue || 0);
  const totalExpenses = Number(financeTotals?.[0]?.totalExpenses || 0);
  const bankBalance = Number(financeTotals?.[0]?.bankBalance || 0);
  const dailyTurnover = Number(dailyTurnoverTotals?.[0]?.total || 0);
  const monthlyTurnover = Number(monthlyTurnoverTotals?.[0]?.total || 0);

  const activeAudits = (auditMetrics || []).filter((audit) => !["completed", "cancelled"].includes(audit.status)).length;
  const pendingRecount = (auditMetrics || []).reduce(
    (sum, audit) =>
      sum +
      (audit?.lines || []).filter((line) => {
        const diff = Math.abs(Number(line?.countedQuantity || 0) - Number(line?.expectedQuantity || 0));
        return Boolean(line?.needsRecount) || diff > 0;
      }).length,
    0
  );
  const completedLast30Days = (auditMetrics || []).filter(
    (audit) => audit.status === "completed" && new Date(audit.completedAt || audit.updatedAt || 0) >= startOfLast30Days
  );
  const avgAuditAccuracy = completedLast30Days.length
    ? completedLast30Days.reduce((sum, audit) => {
        const totalExpected = (audit?.lines || []).reduce((acc, line) => acc + Number(line?.expectedQuantity || 0), 0);
        const totalDiffAbs = (audit?.lines || []).reduce(
          (acc, line) => acc + Math.abs(Number(line?.countedQuantity || 0) - Number(line?.expectedQuantity || 0)),
          0
        );
        const accuracy = totalExpected > 0 ? Math.max(0, ((totalExpected - totalDiffAbs) / totalExpected) * 100) : 100;
        return sum + accuracy;
      }, 0) / completedLast30Days.length
    : 100;

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
      totalExpenses: isAdmin ? totalExpenses : null,
      netProfit: isAdmin ? totalRevenue - totalExpenses : null,
      dailyTurnover,
      monthlyTurnover,
      activeAudits,
      pendingRecount,
      avgAuditAccuracy,
      bankBalance,
      orderCount,
      lowStockCount: lowStockItems.length
    },
    permissions: {
      canViewProfit: isAdmin
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
