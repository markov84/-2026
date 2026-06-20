export function normalizeScanCode(rawValue) {
  if (rawValue == null) return "";
  return String(rawValue).replace(/[\t\n\r]+/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
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

function toComparableCode(value) {
  return normalizeScanCode(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function trimNumericLeadingZeros(value) {
  if (!/^\d+$/.test(value)) return value;
  const trimmed = value.replace(/^0+/, "");
  return trimmed || "0";
}

function getCodeCandidates(rawValue) {
  const parsed = parseScannedInput(rawValue);
  const candidates = new Set();
  const direct = normalizeScanCode(parsed);
  if (!direct) return candidates;

  candidates.add(direct.toLowerCase());

  const decoded = normalizeScanCode(decodeURIComponent(direct));
  if (decoded) candidates.add(decoded.toLowerCase());

  const compact = toComparableCode(direct);
  if (compact) candidates.add(compact);

  const compactDecoded = toComparableCode(decoded);
  if (compactDecoded) candidates.add(compactDecoded);

  const noLeadingZeros = trimNumericLeadingZeros(compact);
  if (noLeadingZeros) candidates.add(noLeadingZeros);

  const noLeadingZerosDecoded = trimNumericLeadingZeros(compactDecoded);
  if (noLeadingZerosDecoded) candidates.add(noLeadingZerosDecoded);

  return candidates;
}

export function findProductByScanCode(products, rawCode) {
  const scanCandidates = getCodeCandidates(rawCode);
  if (!scanCandidates.size) return null;

  const items = Array.isArray(products) ? products : [];
  for (const product of items) {
    const fields = [product?.productNumber, product?.barcode, product?.sku].filter(Boolean);
    for (const field of fields) {
      const productCandidates = getCodeCandidates(field);
      for (const candidate of productCandidates) {
        if (scanCandidates.has(candidate)) {
          return product;
        }
      }
    }
  }

  return null;
}
