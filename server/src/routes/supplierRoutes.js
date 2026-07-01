import { Router } from "express";
import { body, validationResult } from "express-validator";
import { Supplier } from "../models/Supplier.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "manager", "warehouse"));

router.get("/", async (req, res) => {
  const suppliers = await Supplier.find().sort({ createdAt: -1 }).lean();
  return res.json(suppliers);
});

router.post(
  "/",
  [body("name").trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Невалидни данни за доставчика.", errors: errors.array() });
    }

    const supplier = await Supplier.create(req.body);
    return res.status(201).json(supplier);
  }
);

router.put(
  "/:id",
  [body("name").optional().trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Невалидни данни за доставчика.", errors: errors.array() });
    }

    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).lean();

    if (!supplier) {
      return res.status(404).json({ message: "Доставчикът не е намерен." });
    }

    return res.json(supplier);
  }
);

router.delete("/:id", async (req, res) => {
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) {
    return res.status(404).json({ message: "Доставчикът не е намерен." });
  }
  return res.status(204).send();
});

export default router;