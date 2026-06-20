export function normalizeScanCode(rawValue) {
  if (rawValue == null) return "";
  return String(rawValue)
    .replace(/[\u0000-\u001F\u007F]+/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function collapseRepeatedCode(value) {
  const normalized = normalizeScanCode(value).replace(/\s+/g, "");
  if (!normalized || normalized.length < 8) return normalized;

  const length = normalized.length;
  for (let unitLength = 4; unitLength <= Math.floor(length / 2); unitLength += 1) {
    const repeats = Math.floor(length / unitLength);
    if (repeats < 2) continue;

    const unit = normalized.slice(0, unitLength);
    const repeated = unit.repeat(repeats);
    const tail = normalized.slice(repeated.length);
    if (repeated + unit.slice(0, tail.length) === normalized) {
      return unit;
    }
  }

  return normalized;
}

function pickLikelyCodeToken(value) {
  const cleaned = normalizeScanCode(value);
  if (!cleaned) return "";

  const parts = cleaned
    .split(/[|\s]+/)
    .map((part) => normalizeScanCode(part))
    .filter(Boolean);

  if (!parts.length) return cleaned;

  const numericLike = parts.filter((part) => part.replace(/\D/g, "").length >= 8);
  if (numericLike.length) return numericLike[numericLike.length - 1];

  const skuLike = parts.filter((part) => /[a-z]/i.test(part) && /\d/.test(part));
  if (skuLike.length) return skuLike[skuLike.length - 1];

  return parts[parts.length - 1];
}

export function parseScannedInput(rawValue) {
  const cleaned = normalizeScanCode(rawValue);
  if (!cleaned) return "";

  const queryKeys = [
    "barcode",
    "sku",
    "product",
    "code",
    "newProductCode",
    "newProductSku",
    "productNumber",
    "ean",
    "gtin"
  ];

  const getFirstQueryValue = (searchParams) => {
    for (const key of queryKeys) {
      const value = searchParams.get(key);
      if (value) return value;
    }
    return "";
  };

  try {
    const url = new URL(cleaned);
    const codeFromQuery = getFirstQueryValue(url.searchParams);
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

  const queryMatch = cleaned.match(/(?:barcode|sku|product|code|newProductCode|newProductSku|productNumber|ean|gtin)=([^&]+)/i);
  if (queryMatch) {
    return collapseRepeatedCode(normalizeScanCode(safeDecode(queryMatch[1])));
  }

  const likelyToken = pickLikelyCodeToken(cleaned);
  return collapseRepeatedCode(likelyToken);
}

function toComparableCode(value) {
  return normalizeScanCode(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function trimNumericLeadingZeros(value) {
  if (!/^\d+$/.test(value)) return value;
  const trimmed = value.replace(/^0+/, "");
  return trimmed || "0";
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getCodeCandidates(rawValue) {
  const parsed = parseScannedInput(rawValue);
  const candidates = new Set();
  const direct = normalizeScanCode(parsed);
  if (!direct) return candidates;

  candidates.add(direct.toLowerCase());

  const collapsed = collapseRepeatedCode(direct);
  if (collapsed) candidates.add(collapsed.toLowerCase());

  const decoded = normalizeScanCode(safeDecode(direct));
  if (decoded) candidates.add(decoded.toLowerCase());

  const likelyToken = pickLikelyCodeToken(direct);
  if (likelyToken) candidates.add(normalizeScanCode(likelyToken).toLowerCase());

  const compact = toComparableCode(direct);
  if (compact) candidates.add(compact);

  const compactCollapsed = toComparableCode(collapsed);
  if (compactCollapsed) candidates.add(compactCollapsed);

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
    const fields = [product?.productNumber, product?.barcode, product?.sku, product?.qrCode].filter(Boolean);
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
