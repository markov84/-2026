const cache = new Map();

export function getCachedJson(key) {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

export function setCachedJson(key, value, ttlMs = 30000) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

export function clearCachedJson(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
