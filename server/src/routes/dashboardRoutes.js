import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { Customer } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { InventoryItem } from "../models/InventoryItem.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const [productCount, storeCount, customerCount, orderCount, inventoryItems, recentOrders] = await Promise.all([
    Product.countDocuments(),
    Store.countDocuments(),
    Customer.countDocuments(),
    Order.countDocuments(),
    InventoryItem.find().populate("product", "name lowStockThreshold").populate("store", "name").lean(),
    Order.find().sort({ createdAt: -1 }).limit(5).populate("store", "name").lean()
  ]);

  const lowStockCount = inventoryItems.filter(
    (item) => item.quantity <= Math.max(item.reorderLevel, item.product?.lowStockThreshold ?? 0)
  ).length;

  const totalRevenue = recentOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  return res.json({
    stats: [
      { label: "Активни продукти", value: productCount, accent: "primary" },
      { label: "Магазини", value: storeCount, accent: "secondary" },
      { label: "Клиенти", value: customerCount, accent: "success" },
      { label: "Ниски наличности", value: lowStockCount, accent: "danger" }
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
    totals: {
      totalRevenue,
      orderCount,
      lowStockCount
    },
    recentOrders
  });
});

export default router;
