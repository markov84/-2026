import { Router } from "express";
import { body, validationResult } from "express-validator";
import { Customer } from "../models/Customer.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const customers = await Customer.find().populate("preferredStore", "name city").sort({ createdAt: -1 }).lean();
  return res.json(customers);
});

router.post(
  "/",
  [body("fullName").trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid customer payload.", errors: errors.array() });
    }

    const customer = await Customer.create(req.body);
    return res.status(201).json(customer);
  }
);

router.put("/:id", [body("fullName").optional().trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Invalid customer payload.", errors: errors.array() });
  }

  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
    .populate("preferredStore", "name city")
    .lean();

  if (!customer) {
    return res.status(404).json({ message: "Customer not found." });
  }

  return res.json(customer);
});

router.delete("/:id", async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);

  if (!customer) {
    return res.status(404).json({ message: "Customer not found." });
  }

  return res.status(204).send();
});

export default router;
