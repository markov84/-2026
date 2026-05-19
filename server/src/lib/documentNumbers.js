import { Counter } from "../models/Counter.js";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function reserveCounter(counterValue) {
  await Counter.updateOne(
    {
      key: counterValue,
      $or: [{ name: null }, { name: { $exists: false } }]
    },
    { $set: { name: counterValue } }
  );

  return Counter.findOneAndUpdate(
    { key: counterValue },
    {
      $setOnInsert: {
        key: counterValue,
        name: counterValue
      },
      $inc: { value: 1 }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export async function getNextDocumentNumber({ model, field, counterKey, prefix, year = new Date().getFullYear() }) {
  const basePrefix = `${prefix}-${year}-`;
  const counter = await reserveCounter(`${counterKey}:${year}`);

  const latestExisting = await model
    .findOne({ [field]: new RegExp(`^${escapeRegExp(basePrefix)}\\d+$`) })
    .sort({ [field]: -1 })
    .select(field)
    .lean();

  const latestExistingValue = Number(String(latestExisting?.[field] || "").slice(basePrefix.length)) || 0;
  const nextValue = Math.max(Number(counter.value || 0), latestExistingValue + 1);

  if (nextValue !== counter.value) {
    counter.value = nextValue;
    await counter.save();
  }

  return `${basePrefix}${String(nextValue).padStart(3, "0")}`;
}
