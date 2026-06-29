import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { FinancialEntry } from "../models/FinancialEntry.js";
import { Store } from "../models/Store.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

const financeTextLabels = {
  "retail sales": "Продажби на дребно",
  "daily sales batch": "Дневни продажби",
  "b2b project order": "B2B проектна поръчка",
  "interior concept invoicing": "Фактуриране към Interior Concept",
  "supplier payment": "Плащане към доставчик",
  "restock luminaires": "Зареждане на осветителни тела",
  "rent and utilities": "Наем и консумативи",
  "monthly operating costs": "Месечни оперативни разходи",
  "bank balance": "Банкова наличност",
  "current bank liquidity": "Текуща банкова ликвидност"
};

function translateFinanceText(value) {
  if (!value) return value;
  return financeTextLabels[String(value).trim().toLowerCase()] || value;
}

function localizeFinancialEntry(entry) {
  if (!entry) return entry;

  return {
    ...entry,
    category: translateFinanceText(entry.category),
    description: translateFinanceText(entry.description)
  };
}

router.get("/", async (req, res) => {
  const entries = await FinancialEntry.find()
    .sort({ entryDate: -1, createdAt: -1 })
    .populate("store", "name city")
    .lean();
  const localizedEntries = entries.map(localizeFinancialEntry);

  const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const bank = entries.filter((entry) => entry.type === "bank").reduce((sum, entry) => sum + entry.amount, 0);

  return res.json({
    summary: {
      income,
      expenses,
      bank,
      net: income - expenses
    },
    entries: localizedEntries
  });
});

router.post(
  "/",
  [
    body("type").isIn(["income", "expense", "bank"]),
    body("category").trim().notEmpty(),
    body("amount").isFloat({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid finance payload.", errors: errors.array() });
    }

    if (req.body.store) {
      const storeExists = await Store.exists({ _id: req.body.store });
      if (!storeExists) {
        return res.status(404).json({ message: "Store not found." });
      }
    }

    const entry = await FinancialEntry.create(req.body);
    const populated = await FinancialEntry.findById(entry._id).populate("store", "name city").lean();
    return res.status(201).json(localizeFinancialEntry(populated));
  }
);

router.put(
  "/:id",
  [
    body("type").optional().isIn(["income", "expense", "bank"]),
    body("category").optional().trim().notEmpty(),
    body("amount").optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid finance payload.", errors: errors.array() });
    }

    if (req.body.store) {
      const storeExists = await Store.exists({ _id: req.body.store });
      if (!storeExists) {
        return res.status(404).json({ message: "Store not found." });
      }
    }

    const entry = await FinancialEntry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate("store", "name city")
      .lean();

    if (!entry) {
      return res.status(404).json({ message: "Financial entry not found." });
    }

    return res.json(localizeFinancialEntry(entry));
  }
);

router.delete("/:id", async (req, res) => {
  const entry = await FinancialEntry.findByIdAndDelete(req.params.id);

  if (!entry) {
    return res.status(404).json({ message: "Financial entry not found." });
  }

  return res.status(204).send();
});

export default router;
