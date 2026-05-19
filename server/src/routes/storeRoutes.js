import { Router } from "express";
import { body, validationResult } from "express-validator";
import { Store } from "../models/Store.js";
import { requireAuth } from "../middleware/auth.js";
import { clearCachedJson, getCachedJson, setCachedJson } from "../lib/routeCache.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const cachedStores = getCachedJson("stores:list");
  if (cachedStores) {
    return res.json(cachedStores);
  }

  const stores = await Store.find().sort({ name: 1 }).lean();
  setCachedJson("stores:list", stores);
  return res.json(stores);
});

router.post(
  "/",
  [
    body("name").trim().notEmpty(),
    body("code").trim().notEmpty(),
    body("city").trim().notEmpty(),
    body("address").trim().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid store payload.", errors: errors.array() });
    }

    const store = await Store.create(req.body);
    clearCachedJson("stores:");
    return res.status(201).json(store);
  }
);

router.put(
  "/:id",
  [
    body("name").optional().trim().notEmpty(),
    body("code").optional().trim().notEmpty(),
    body("city").optional().trim().notEmpty(),
    body("address").optional().trim().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid store payload.", errors: errors.array() });
    }

    const store = await Store.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found." });
    }

    clearCachedJson("stores:");
    clearCachedJson("inventory:");
    return res.json(store);
  }
);

router.delete("/:id", async (req, res) => {
  const store = await Store.findByIdAndDelete(req.params.id);

  if (!store) {
    return res.status(404).json({ message: "Store not found." });
  }

  clearCachedJson("stores:");
  clearCachedJson("inventory:");
  return res.status(204).send();
});

export default router;
