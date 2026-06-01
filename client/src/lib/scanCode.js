export function normalizeScanCode(rawValue) {
  if (rawValue == null) return "";
  return String(rawValue).replace(/[\t\n\r]+/g, "").trim();
}

export function parseScannedInput(rawValue) {
  const cleaned = normalizeScanCode(rawValue);
  if (!cleaned) return "";

  try {
    const url = new URL(cleaned);
    const query = url.searchParams;
    const codeFromQuery = query.get("barcode") || query.get("sku") || query.get("product") || query.get("code");
    if (codeFromQuery) return normalizeScanCode(codeFromQuery);

    const pathSegments = url.pathname.split("/").filter(Boolean);
    if (pathSegments.length) {
      const candidate = pathSegments[pathSegments.length - 1];
      if (/^[A-Za-z0-9_-]+$/.test(candidate)) {
        return normalizeScanCode(candidate);
      }
    }
  } catch {
    // not a URL, continue parsing raw value
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") {
      return normalizeScanCode(
        parsed.barcode || parsed.sku || parsed.product || parsed.code || JSON.stringify(parsed)
      );
    }
  } catch {
    // not JSON
  }

  const queryMatch = cleaned.match(/(?:barcode|sku|product|code)=([^&]+)/i);
  if (queryMatch) {
    return normalizeScanCode(decodeURIComponent(queryMatch[1]));
  }

  return cleaned;
}
