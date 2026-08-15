import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";
import { formatCurrencyEUR, formatDate as formatUiDate } from "./currency";

const LABEL_SCALE_STORAGE_KEY = "productLabelScalePercent";
const DEFAULT_LABEL_SCALE_PERCENT = 100;
export const MIN_LABEL_SCALE_PERCENT = 60;
export const MAX_LABEL_SCALE_PERCENT = 280;
export const MIN_LABEL_DIMENSION_MM = 20;
export const MAX_LABEL_DIMENSION_MM = 200;
const LABEL_COPIES_STORAGE_KEY = "productLabelCopies";
const DEFAULT_LABEL_COPIES = 1;
const MAX_LABEL_COPIES = 500;
const LABEL_PAPER_PRESET_STORAGE_KEY = "productLabelPaperPreset";
const LABEL_CUSTOM_WIDTH_MM_STORAGE_KEY = "productLabelCustomWidthMm";
const LABEL_CUSTOM_HEIGHT_MM_STORAGE_KEY = "productLabelCustomHeightMm";
const LABEL_THERMAL_ORIENTATION_STORAGE_KEY = "productLabelThermalOrientation";
const LABEL_OFFSET_X_MM_STORAGE_KEY = "productLabelOffsetXmm";
const LABEL_OFFSET_Y_MM_STORAGE_KEY = "productLabelOffsetYmm";
const DEFAULT_LABEL_PAPER_PRESET = "thermal-40x30";
const DEFAULT_CUSTOM_WIDTH_MM = 60;
const DEFAULT_CUSTOM_HEIGHT_MM = 40;
const DEFAULT_THERMAL_ORIENTATION = "long-edge";
const DEFAULT_LABEL_OFFSET_X_MM = 0;
const DEFAULT_LABEL_OFFSET_Y_MM = 0;
export const MIN_LABEL_OFFSET_MM = -20;
export const MAX_LABEL_OFFSET_MM = 20;

export const PRODUCT_LABEL_PAPER_PRESETS = [
  { id: "thermal-30x20", label: "Термо: 30 x 20 mm", kind: "thermal", widthMm: 30, heightMm: 20 },
  { id: "thermal-40x20", label: "Термо: 40 x 20 mm", kind: "thermal", widthMm: 40, heightMm: 20 },
  { id: "thermal-40x30", label: "M221 често: 40 x 30 mm", kind: "thermal", widthMm: 40, heightMm: 30 },
  { id: "thermal-50x30", label: "M221 често: 50 x 30 mm", kind: "thermal", widthMm: 50, heightMm: 30 },
  { id: "thermal-50x40", label: "M221 често: 50 x 40 mm", kind: "thermal", widthMm: 50, heightMm: 40 },
  { id: "thermal-58x40", label: "Термо: 58 x 40 mm", kind: "thermal", widthMm: 58, heightMm: 40 },
  { id: "thermal-60x40", label: "M221 често: 60 x 40 mm", kind: "thermal", widthMm: 60, heightMm: 40 },
  { id: "thermal-80x50", label: "Термо: 80 x 50 mm", kind: "thermal", widthMm: 80, heightMm: 50 },
  { id: "thermal-100x150", label: "Куриерски: 100 x 150 mm (4x6 in)", kind: "thermal", widthMm: 100, heightMm: 150 },
  { id: "thermal-70x80", label: "M221 често: 70 x 80 mm", kind: "thermal", widthMm: 70, heightMm: 80 },
  { id: "thermal-custom", label: "M221 персонален размер (mm)", kind: "thermal-custom" },
  { id: "a4-3x8", label: "A4 лист (3 x 8 етикета)", kind: "a4", columns: 3, rows: 8, gapMm: 4 }
];

export const PRODUCT_LABEL_THERMAL_ORIENTATIONS = [
  { id: "long-edge", label: "По дългата страна" },
  { id: "short-edge", label: "По късата страна" }
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return formatUiDate(value);
}

async function loadImageAsDataUrl(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function getItemRows(items = [], { priceIncludesVat = false } = {}) {
  return items
    .map((item, index) => {
      const productName = item.product?.name || item.description || "-";
      const sku = item.product?.sku ? ` (${item.product.sku})` : "";
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice ?? item.product?.price ?? 0);
      const vatRate = Number(item.vatRate ?? 0);
      const grossAmount = quantity * unitPrice;
      const vatDivider = 1 + vatRate / 100;
      const subtotal = priceIncludesVat && vatDivider > 0 ? grossAmount / vatDivider : grossAmount;
      const total = priceIncludesVat ? grossAmount : subtotal + subtotal * (vatRate / 100);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(productName)}${escapeHtml(sku)}</td>
          <td>${escapeHtml(item.unit || "бр.")}</td>
          <td class="num">${quantity}</td>
          <td class="num">${formatCurrencyEUR(unitPrice)}</td>
          <td class="num">${vatRate ? `${vatRate}%` : "-"}</td>
          <td class="num">${formatCurrencyEUR(vatRate ? total : subtotal)}</td>
        </tr>
      `;
    })
    .join("");
}

export function buildDocumentHtml(title, bodyHtml) {
  const companyLogoUrl = new URL("/MARK%20LIGHT.png", window.location.origin).toString();

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            color: #111827;
            font-family: "Segoe UI", Arial, sans-serif;
            background: #ffffff;
          }
          .document {
            max-width: 980px;
            margin: 0 auto;
          }
          .company-bar {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 18px;
            padding-bottom: 16px;
            border-bottom: 1px solid #d1d5db;
          }
          .company-logo {
            width: 64px;
            height: 64px;
            object-fit: contain;
            flex: 0 0 auto;
          }
          .company-name {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.04em;
            color: #111827;
          }
          .company-tagline {
            margin-top: 2px;
            color: #6b7280;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            border-bottom: 2px solid #1f2937;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .brand {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 0.04em;
          }
          h1 {
            margin: 0;
            font-size: 24px;
          }
          h2 {
            margin: 24px 0 10px;
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          p {
            margin: 4px 0;
          }
          .muted {
            color: #6b7280;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }
          .box {
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th,
          td {
            border: 1px solid #d1d5db;
            padding: 5px 6px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #f3f4f6;
          }
          .num {
            text-align: right;
            white-space: nowrap;
          }
          .totals {
            width: 240px;
            margin-left: auto;
            margin-top: 10px;
          }
          .totals p {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            margin: 2px 0;
            line-height: 1.15;
          }
          .total {
            font-weight: 800;
            font-size: 18px;
            border-top: 1px solid #111827;
            padding-top: 4px;
          }
          .footer {
            margin-top: 44px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 42px;
          }
          .signature {
            border-top: 1px solid #111827;
            padding-top: 8px;
            text-align: center;
          }
          @media print {
            body { padding: 0; }
            .document { max-width: none; }
          }
        </style>
      </head>
      <body>
        <main class="document">
          <section class="company-bar">
            <img class="company-logo" src="${escapeHtml(companyLogoUrl)}" alt="MARK LIGHT logo" />
            <div>
              <div class="company-name">MARK LIGHT</div>
              <div class="company-tagline">LIGHTING TRADE</div>
            </div>
          </section>
          ${bodyHtml}
        </main>
      </body>
    </html>
  `;
}

function printHtml(title, bodyHtml) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(buildDocumentHtml(title, bodyHtml));
  printWindow.document.write(`
    <script>
      window.addEventListener("load", () => {
        window.print();
      });
    </script>
  `);
  printWindow.document.close();
}

function printCustomHtml(title, html) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        ${html}
        <script>
          window.addEventListener("load", () => {
            window.print();
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function printPdfDocument(pdfDocument) {
  if (!pdfDocument) return;

  pdfDocument.setProperties({ title: "Етикет" });
  const blobUrl = pdfDocument.output("bloburl");
  const printWindow = window.open(blobUrl, "_blank");
  if (!printWindow) return;
}

async function createBarcodePng(data, { barWidth = 1.8, height = 56 } = {}) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, data, {
    format: "CODE128",
    width: barWidth,
    height,
    displayValue: false,
    margin: 0
  });

  return canvas.toDataURL("image/png");
}

async function createQrPng(data, size = 180) {
  return QRCode.toDataURL(data, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#111827", light: "#ffffff" }
  });
}

function clampLabelScalePercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LABEL_SCALE_PERCENT;
  return Math.min(MAX_LABEL_SCALE_PERCENT, Math.max(MIN_LABEL_SCALE_PERCENT, Math.round(numeric)));
}

function clampLabelCopies(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LABEL_COPIES;
  return Math.min(MAX_LABEL_COPIES, Math.max(1, Math.round(numeric)));
}

function normalizeThermalOrientation(value) {
  return PRODUCT_LABEL_THERMAL_ORIENTATIONS.some((option) => option.id === value) ? value : DEFAULT_THERMAL_ORIENTATION;
}

function getPaperPresetById(presetId) {
  return PRODUCT_LABEL_PAPER_PRESETS.find((preset) => preset.id === presetId) || PRODUCT_LABEL_PAPER_PRESETS[0];
}

function clampLabelDimensionMm(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(MAX_LABEL_DIMENSION_MM, Math.max(MIN_LABEL_DIMENSION_MM, Math.round(numeric)));
}

function clampLabelOffsetMm(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(MAX_LABEL_OFFSET_MM, Math.max(MIN_LABEL_OFFSET_MM, Number(numeric.toFixed(1))));
}

function resolveThermalSizeMm(preset, customWidthMm, customHeightMm) {
  if (preset.kind === "thermal-custom") {
    return {
      widthMm: clampLabelDimensionMm(customWidthMm, DEFAULT_CUSTOM_WIDTH_MM),
      heightMm: clampLabelDimensionMm(customHeightMm, DEFAULT_CUSTOM_HEIGHT_MM)
    };
  }
  return {
    widthMm: clampLabelDimensionMm(preset.widthMm, DEFAULT_CUSTOM_WIDTH_MM),
    heightMm: clampLabelDimensionMm(preset.heightMm, DEFAULT_CUSTOM_HEIGHT_MM)
  };
}

function resolveThermalPrintSurface(sizeMm, orientation) {
  const longSideMm = Math.max(sizeMm.widthMm, sizeMm.heightMm);
  const shortSideMm = Math.min(sizeMm.widthMm, sizeMm.heightMm);
  const safeOrientation = normalizeThermalOrientation(orientation);

  if (safeOrientation === "long-edge") {
    return {
      pageWidthMm: longSideMm,
      pageHeightMm: shortSideMm,
      contentWidthMm: longSideMm,
      contentHeightMm: shortSideMm,
      rotationClassName: ""
    };
  }

  return {
    pageWidthMm: shortSideMm,
    pageHeightMm: longSideMm,
    contentWidthMm: shortSideMm,
    contentHeightMm: longSideMm,
    rotationClassName: ""
  };
}

export function getProductLabelScale() {
  if (typeof window === "undefined") return DEFAULT_LABEL_SCALE_PERCENT;
  const storedValue = window.localStorage.getItem(LABEL_SCALE_STORAGE_KEY);
  if (storedValue === "78") {
    window.localStorage.setItem(LABEL_SCALE_STORAGE_KEY, String(DEFAULT_LABEL_SCALE_PERCENT));
    return DEFAULT_LABEL_SCALE_PERCENT;
  }
  return clampLabelScalePercent(storedValue || DEFAULT_LABEL_SCALE_PERCENT);
}

export function setProductLabelScale(scalePercent) {
  if (typeof window === "undefined") return;
  const safeScale = clampLabelScalePercent(scalePercent);
  window.localStorage.setItem(LABEL_SCALE_STORAGE_KEY, String(safeScale));
}

export function getProductLabelCopies() {
  if (typeof window === "undefined") return DEFAULT_LABEL_COPIES;
  const storedValue = window.localStorage.getItem(LABEL_COPIES_STORAGE_KEY);
  return clampLabelCopies(storedValue || DEFAULT_LABEL_COPIES);
}

export function setProductLabelCopies(copies) {
  if (typeof window === "undefined") return;
  const safeCopies = clampLabelCopies(copies);
  window.localStorage.setItem(LABEL_COPIES_STORAGE_KEY, String(safeCopies));
}

export function getProductLabelPaperPreset() {
  if (typeof window === "undefined") return DEFAULT_LABEL_PAPER_PRESET;
  const storedPreset = window.localStorage.getItem(LABEL_PAPER_PRESET_STORAGE_KEY) || DEFAULT_LABEL_PAPER_PRESET;
  return getPaperPresetById(storedPreset).id;
}

export function setProductLabelPaperPreset(presetId) {
  if (typeof window === "undefined") return;
  const safePreset = getPaperPresetById(presetId).id;
  window.localStorage.setItem(LABEL_PAPER_PRESET_STORAGE_KEY, safePreset);
}

export function getProductLabelThermalOrientation() {
  if (typeof window === "undefined") return DEFAULT_THERMAL_ORIENTATION;
  return normalizeThermalOrientation(window.localStorage.getItem(LABEL_THERMAL_ORIENTATION_STORAGE_KEY));
}

export function setProductLabelThermalOrientation(orientation) {
  if (typeof window === "undefined") return;
  const safeOrientation = normalizeThermalOrientation(orientation);
  window.localStorage.setItem(LABEL_THERMAL_ORIENTATION_STORAGE_KEY, safeOrientation);
}

export function getProductLabelCustomWidthMm() {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_WIDTH_MM;
  return clampLabelDimensionMm(window.localStorage.getItem(LABEL_CUSTOM_WIDTH_MM_STORAGE_KEY), DEFAULT_CUSTOM_WIDTH_MM);
}

export function setProductLabelCustomWidthMm(widthMm) {
  if (typeof window === "undefined") return;
  const safeWidth = clampLabelDimensionMm(widthMm, DEFAULT_CUSTOM_WIDTH_MM);
  window.localStorage.setItem(LABEL_CUSTOM_WIDTH_MM_STORAGE_KEY, String(safeWidth));
}

export function getProductLabelCustomHeightMm() {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_HEIGHT_MM;
  return clampLabelDimensionMm(window.localStorage.getItem(LABEL_CUSTOM_HEIGHT_MM_STORAGE_KEY), DEFAULT_CUSTOM_HEIGHT_MM);
}

export function setProductLabelCustomHeightMm(heightMm) {
  if (typeof window === "undefined") return;
  const safeHeight = clampLabelDimensionMm(heightMm, DEFAULT_CUSTOM_HEIGHT_MM);
  window.localStorage.setItem(LABEL_CUSTOM_HEIGHT_MM_STORAGE_KEY, String(safeHeight));
}

export function getProductLabelOffsetXmm() {
  if (typeof window === "undefined") return DEFAULT_LABEL_OFFSET_X_MM;
  return clampLabelOffsetMm(window.localStorage.getItem(LABEL_OFFSET_X_MM_STORAGE_KEY), DEFAULT_LABEL_OFFSET_X_MM);
}

export function setProductLabelOffsetXmm(value) {
  if (typeof window === "undefined") return;
  const safeOffset = clampLabelOffsetMm(value, DEFAULT_LABEL_OFFSET_X_MM);
  window.localStorage.setItem(LABEL_OFFSET_X_MM_STORAGE_KEY, String(safeOffset));
}

export function getProductLabelOffsetYmm() {
  if (typeof window === "undefined") return DEFAULT_LABEL_OFFSET_Y_MM;
  return clampLabelOffsetMm(window.localStorage.getItem(LABEL_OFFSET_Y_MM_STORAGE_KEY), DEFAULT_LABEL_OFFSET_Y_MM);
}

export function setProductLabelOffsetYmm(value) {
  if (typeof window === "undefined") return;
  const safeOffset = clampLabelOffsetMm(value, DEFAULT_LABEL_OFFSET_Y_MM);
  window.localStorage.setItem(LABEL_OFFSET_Y_MM_STORAGE_KEY, String(safeOffset));
}

function buildSingleLabelHtml({ product, fallbackCode, barcodeDataUrl, qrDataUrl, logoDataUrl, scale, offsetXmm, offsetYmm, isThermal }) {
  const readabilityBoost = isThermal ? 1.35 : 1;
  const cardPadding = Math.max(6, Math.round(7 * scale));
  const qrPx = Math.max(isThermal ? 34 : 26, Math.round((isThermal ? 34 : 30) * scale * readabilityBoost));
  const titleFont = Math.max(isThermal ? 12 : 10, Math.round(12 * scale * readabilityBoost));
  const skuFont = Math.max(isThermal ? 10 : 8, Math.round(9 * scale * readabilityBoost));
  const metaFont = Math.max(isThermal ? 10 : 8, Math.round(9 * scale * readabilityBoost));
  const codeFont = Math.max(isThermal ? 11 : 9, Math.round(10 * scale * readabilityBoost));
  const modelCode = String(product?.productNumber || product?.sku || "").trim() || "-";
  const logoHtml = logoDataUrl
    ? `<img src="${escapeHtml(logoDataUrl)}" alt="Logo" style="height:${Math.max(10, Math.round(12 * scale))}px; width:auto; display:block; margin-bottom:2px;" />`
    : "";

  return `
    <article class="label-card" style="padding:${cardPadding}px; left:${offsetXmm}mm; top:${offsetYmm}mm;">
      ${logoHtml}
      <div class="label-title" style="font-size:${titleFont}px;">${escapeHtml(product?.name || "Продукт")}</div>
      <div class="label-subtitle" style="font-size:${skuFont}px;">Модел: ${escapeHtml(modelCode)}</div>
      <div class="label-meta" style="font-size:${metaFont}px;">Баркод: ${escapeHtml(fallbackCode)}</div>

      <div class="label-main-row">
        <div class="label-barcode-wrap">
          <img src="${escapeHtml(barcodeDataUrl)}" alt="Barcode" style="max-width:100%; height:auto; display:block;" />
          <div style="font-size:${codeFont}px; margin-top:3px; font-weight:700; letter-spacing:0.05em; line-height:1.15;">${escapeHtml(fallbackCode)}</div>
        </div>
        <div class="label-qr-wrap">
          <img src="${escapeHtml(qrDataUrl)}" alt="QR code" style="width:${qrPx}px; height:${qrPx}px; max-width:100%; display:block;" />
        </div>
      </div>
    </article>
  `;
}

function truncateText(value, maxChars) {
  const text = String(value || "").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function drawThermalLabelOnPdf(pdf, {
  product,
  fallbackCode,
  barcodeDataUrl,
  qrDataUrl,
  logoDataUrl,
  pageWidthMm,
  pageHeightMm,
  offsetXmm,
  offsetYmm,
  scale
}) {
  const safeScale = Math.max(1, scale);
  const marginLeft = 1.2;
  const marginTop = 1.0;
  const marginRight = 2.2;
  const marginBottom = 1.4;
  const baseX = clampNumber(marginLeft + offsetXmm, 0.4, Math.max(0.4, pageWidthMm - marginRight - 12));
  const baseY = clampNumber(marginTop + offsetYmm, 0.4, Math.max(0.4, pageHeightMm - marginBottom - 12));
  const contentWidth = Math.max(12, pageWidthMm - baseX - marginRight);
  const contentHeight = Math.max(12, pageHeightMm - baseY - marginBottom);

  const titlePt = Math.max(10, Math.round(9.5 * safeScale));
  const metaPt = Math.max(8, Math.round(7.5 * safeScale));
  const codePt = Math.max(9, Math.round(8.4 * safeScale));
  const bottomReserved = Math.max(12, contentHeight * 0.5);
  const topAreaHeight = Math.max(8, contentHeight - bottomReserved);
  const qrSize = Math.min(Math.max(10.5, 12.5 * safeScale), contentHeight * 0.44);
  const barcodeHeightBase = Math.min(Math.max(9.5, 10.8 * safeScale), contentHeight * 0.29);
  const gap = 1.2;
  const qrX = baseX + contentWidth - qrSize;
  const barcodeWidth = Math.max(10.5, qrX - baseX - gap);
  const qrY = baseY + contentHeight - qrSize - 1.2;

  let cursorY = baseY;
  if (logoDataUrl) {
    const logoMaxWidth = Math.max(11, contentWidth * 0.65);
    const logoMaxHeight = Math.max(4.8, topAreaHeight * 0.42);
    const logoProps = pdf.getImageProperties(logoDataUrl);
    const logoRatio = logoProps.width > 0 && logoProps.height > 0 ? logoProps.width / logoProps.height : 3;
    let logoWidth = logoMaxWidth;
    let logoHeight = logoWidth / logoRatio;
    if (logoHeight > logoMaxHeight) {
      logoHeight = logoMaxHeight;
      logoWidth = logoHeight * logoRatio;
    }
    pdf.addImage(logoDataUrl, "PNG", baseX, cursorY, logoWidth, logoHeight, undefined, "FAST");
    cursorY += logoHeight + 0.8;
  }

  const productName = truncateText(product?.name || "Продукт", 52);
  const modelCodeRaw = String(product?.productNumber || "").trim();
  const skuCodeRaw = String(product?.sku || "").trim();
  const modelCode = truncateText(modelCodeRaw || "-", 30);
  const skuCode = truncateText(skuCodeRaw || "-", 30);
  const sameModelAndSku = modelCodeRaw && skuCodeRaw && modelCodeRaw.toLowerCase() === skuCodeRaw.toLowerCase();

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(titlePt);
  const titleLines = pdf.splitTextToSize(productName, Math.max(12, contentWidth - 0.2));
  pdf.text(titleLines.slice(0, 2), baseX, cursorY + 0.2, { baseline: "top" });
  cursorY += Math.min(topAreaHeight * 0.48, 5.8 + 2.4 * safeScale);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(metaPt);
  if (sameModelAndSku) {
    pdf.text(`Model/SKU: ${modelCode}`, baseX, cursorY, { baseline: "top" });
    cursorY += 3.2;
  } else {
    pdf.text(`Model: ${modelCode}`, baseX, cursorY, { baseline: "top" });
    cursorY += 3.2;
    pdf.text(`SKU: ${skuCode}`, baseX, cursorY, { baseline: "top" });
    cursorY += 3.2;
  }
  pdf.text(`Barcode: ${fallbackCode}`, baseX, cursorY, { baseline: "top" });

  const codeY = baseY + contentHeight - 0.7;
  const codeGapMm = 2.3;
  const barcodeBottomLimit = codeY - codeGapMm;
  const barcodeTop = cursorY + 1.2;
  const maxBarcodeHeight = Math.max(7.2, barcodeBottomLimit - barcodeTop);
  const barcodeHeight = Math.max(7.2, Math.min(barcodeHeightBase, maxBarcodeHeight));
  const barcodeY = Math.max(barcodeTop, barcodeBottomLimit - barcodeHeight);

  pdf.addImage(barcodeDataUrl, "PNG", baseX, barcodeY, barcodeWidth, barcodeHeight, undefined, "FAST");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(codePt);
  pdf.text(String(fallbackCode), baseX, codeY, { baseline: "bottom" });

  pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize, undefined, "FAST");
}

function printThermalLabelPdf({
  product,
  fallbackCode,
  barcodeDataUrl,
  qrDataUrl,
  logoDataUrl,
  copies,
  thermalPrintSurface,
  scale,
  offsetXmm,
  offsetYmm
}) {
  const orientation = thermalPrintSurface.pageWidthMm >= thermalPrintSurface.pageHeightMm ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: [thermalPrintSurface.pageWidthMm, thermalPrintSurface.pageHeightMm],
    compress: true
  });

  for (let index = 0; index < copies; index += 1) {
    if (index > 0) {
      pdf.addPage([thermalPrintSurface.pageWidthMm, thermalPrintSurface.pageHeightMm], orientation);
    }
    drawThermalLabelOnPdf(pdf, {
      product,
      fallbackCode,
      barcodeDataUrl,
      qrDataUrl,
      logoDataUrl,
      pageWidthMm: thermalPrintSurface.pageWidthMm,
      pageHeightMm: thermalPrintSurface.pageHeightMm,
      offsetXmm,
      offsetYmm,
      scale
    });
  }

  printPdfDocument(pdf);
}

export async function printProductLabel(product, { scalePercent, copies, paperPreset, customWidthMm, customHeightMm, thermalOrientation, offsetXmm, offsetYmm } = {}) {
  const storeUrl = "https://marklight.bg/";
  const safeScalePercent = clampLabelScalePercent(scalePercent ?? getProductLabelScale());
  const safeCopies = clampLabelCopies(copies ?? getProductLabelCopies());
  const safePaperPreset = getPaperPresetById(paperPreset ?? getProductLabelPaperPreset());
  const safeOffsetXmm = clampLabelOffsetMm(offsetXmm ?? getProductLabelOffsetXmm(), DEFAULT_LABEL_OFFSET_X_MM);
  const safeOffsetYmm = clampLabelOffsetMm(offsetYmm ?? getProductLabelOffsetYmm(), DEFAULT_LABEL_OFFSET_Y_MM);
  const thermalSize = resolveThermalSizeMm(
    safePaperPreset,
    customWidthMm ?? getProductLabelCustomWidthMm(),
    customHeightMm ?? getProductLabelCustomHeightMm()
  );
  const thermalPrintSurface = resolveThermalPrintSurface(thermalSize, thermalOrientation ?? getProductLabelThermalOrientation());
  const isA4Sheet = safePaperPreset.kind === "a4";
  const thermalAreaMm = thermalPrintSurface.contentWidthMm * thermalPrintSurface.contentHeightMm;
  const thermalMinReadableScalePercent = thermalAreaMm <= 2000 ? 175 : thermalAreaMm <= 3600 ? 150 : 130;
  const effectiveScalePercent = isA4Sheet ? safeScalePercent : Math.max(safeScalePercent, thermalMinReadableScalePercent);
  const scale = effectiveScalePercent / 100;
  const code = String(product?.barcode || product?.sku || product?.productNumber || "").trim();
  const title = `Етикет ${product?.name || "продукт"}`;
  const fallbackCode = code || String(product?._id || "").slice(-8);
  const codeLength = String(fallbackCode).length;
  const barcodeWidthBase = isA4Sheet
    ? codeLength > 20
      ? 1.0
      : codeLength > 16
        ? 1.15
        : codeLength > 12
          ? 1.3
          : 1.5
    : codeLength > 20
      ? 0.58
      : codeLength > 16
        ? 0.7
        : codeLength > 12
          ? 0.85
          : 1.05;
  const barcodeDataUrl = await createBarcodePng(fallbackCode, {
    barWidth: Math.max(isA4Sheet ? 1.0 : 0.9, Number((barcodeWidthBase * scale).toFixed(2))),
    height: Math.max(isA4Sheet ? 56 : 62, Math.round((isA4Sheet ? 64 : 68) * scale))
  });
  const qrDataUrl = await createQrPng(storeUrl, Math.max(isA4Sheet ? 72 : 74, Math.round((isA4Sheet ? 84 : 78) * scale)));
  const logoDataUrl = await loadImageAsDataUrl(new URL("/MARK%20LIGHT.png", window.location.origin).toString());

  const labelHtml = buildSingleLabelHtml({
    product,
    fallbackCode,
    barcodeDataUrl,
    qrDataUrl,
    logoDataUrl,
    scale,
    offsetXmm: safeOffsetXmm,
    offsetYmm: safeOffsetYmm,
    isThermal: !isA4Sheet
  });

  const labelsHtml = Array.from({ length: safeCopies }, () => labelHtml).join("");
  const thermalLabelsHtml = Array.from({ length: safeCopies }, () => `<div class="label-print-surface">${labelHtml}</div>`).join("");

  if (!isA4Sheet) {
    printThermalLabelPdf({
      product,
      fallbackCode,
      barcodeDataUrl,
      qrDataUrl,
      logoDataUrl,
      copies: safeCopies,
      thermalPrintSurface,
      scale,
      offsetXmm: safeOffsetXmm,
      offsetYmm: safeOffsetYmm
    });
    return;
  }

  const bodyHtml = isA4Sheet
    ? `
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          font-family: "Segoe UI", Arial, sans-serif;
          color: #111827;
        }
        .label-sheet {
          display: grid;
          grid-template-columns: repeat(${safePaperPreset.columns || 3}, minmax(0, 1fr));
          gap: ${safePaperPreset.gapMm || 4}mm;
        }
        .label-card {
          width: 100%;
          min-height: 31mm;
          border: 1px solid #111827;
          border-radius: 2mm;
          text-align: left;
          page-break-inside: avoid;
          overflow: visible;
        }
        .label-title {
          font-weight: 800;
          line-height: 1.2;
          margin: 0 0 2px;
        }
        .label-subtitle {
          color: #4b5563;
          line-height: 1.2;
          margin: 0 0 2px;
        }
        .label-meta {
          color: #111827;
          line-height: 1.2;
          margin: 0 0 4px;
          font-weight: 700;
        }
        .label-main-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .label-barcode-wrap {
          flex: 1 1 auto;
          min-width: 0;
        }
        .label-qr-wrap {
          flex: 0 0 auto;
          display: flex;
          justify-content: flex-start;
          margin-top: 2px;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
      <section class="label-sheet">${labelsHtml}</section>
    `
    : `
      <style>
        @page { size: ${thermalPrintSurface.pageWidthMm}mm ${thermalPrintSurface.pageHeightMm}mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          width: ${thermalPrintSurface.pageWidthMm}mm;
          height: ${thermalPrintSurface.pageHeightMm}mm;
          font-family: "Segoe UI", Arial, sans-serif;
          color: #111827;
        }
        .label-sheet {
          width: ${thermalPrintSurface.pageWidthMm}mm;
          height: ${thermalPrintSurface.pageHeightMm}mm;
        }
        .label-print-surface {
          width: ${thermalPrintSurface.pageWidthMm}mm;
          height: ${thermalPrintSurface.pageHeightMm}mm;
          display: block;
          overflow: hidden;
          page-break-inside: avoid;
          break-inside: avoid;
          page-break-after: always;
          break-after: page;
        }
        .label-print-surface:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .label-card {
          width: 100%;
          height: 100%;
          min-height: 100%;
          text-align: left;
          overflow: hidden;
          position: relative;
        }
        .label-title {
          font-weight: 800;
          line-height: 1.2;
          margin: 0 0 2px;
        }
        .label-subtitle {
          color: #4b5563;
          line-height: 1.2;
          margin: 0 0 2px;
        }
        .label-meta {
          color: #111827;
          line-height: 1.2;
          margin: 0 0 4px;
          font-weight: 700;
        }
        .label-main-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .label-barcode-wrap {
          flex: 1 1 auto;
          min-width: 0;
        }
        .label-qr-wrap {
          flex: 0 0 auto;
          display: flex;
          justify-content: flex-start;
          margin-top: 2px;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
      <section class="label-sheet ${thermalPrintSurface.rotationClassName}">${thermalLabelsHtml}</section>
    `;

  printCustomHtml(title, bodyHtml);
}

function composeInvoiceDocument(invoice) {
  const supplier = invoice.supplier || {};
  const subtotal = Number(invoice.subtotal || 0);
  const vatAmount = Number(invoice.vatAmount || 0);
  const totalAmount = Number(invoice.totalAmount || 0);

  return {
    title: `Фактура ${invoice.invoiceNumber || ""}`,
    bodyHtml: `
      <section class="header">
        <div>
          <div class="brand">${escapeHtml(supplier.name || "MARK LIGHT LTD")}</div>
          <p class="muted">${escapeHtml(supplier.address || "")}</p>
          <p>ЕИК: ${escapeHtml(supplier.idNumber || "-")} ${supplier.vatNumber ? ` | ДДС: ${escapeHtml(supplier.vatNumber)}` : ""}</p>
        </div>
        <div>
          <h1>ФАКТУРА</h1>
          <p><strong>№:</strong> ${escapeHtml(invoice.invoiceNumber || "-")}</p>
          <p><strong>Дата:</strong> ${formatDate(invoice.issueDate)}</p>
          <p><strong>Данъчно събитие:</strong> ${formatDate(invoice.taxEventDate || invoice.issueDate)}</p>
        </div>
      </section>

      <section class="grid">
        <div class="box">
          <h2>Доставчик</h2>
          <p><strong>${escapeHtml(supplier.name || "MARK LIGHT LTD")}</strong></p>
          <p>${escapeHtml(supplier.address || "")}</p>
          <p>ЕИК: ${escapeHtml(supplier.idNumber || "-")}</p>
          <p>МОЛ: ${escapeHtml(supplier.manager || "-")}</p>
          ${supplier.bank ? `<p>Банка: ${escapeHtml(supplier.bank)}</p>` : ""}
          ${supplier.iban ? `<p>IBAN: ${escapeHtml(supplier.iban)}</p>` : ""}
        </div>
        <div class="box">
          <h2>Получател</h2>
          <p><strong>${escapeHtml(invoice.customerName || "-")}</strong></p>
          <p>${escapeHtml(invoice.customerAddress || "")}</p>
          <p>ЕИК/ЕГН: ${escapeHtml(invoice.customerIdNumber || "-")}</p>
          <p>ДДС номер: ${escapeHtml(invoice.customerVatNumber || "-")}</p>
        </div>
      </section>

      <h2>Редове</h2>
      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Описание</th>
            <th>Мярка</th>
            <th class="num">Кол.</th>
            <th class="num">Ед. цена</th>
            <th class="num">ДДС</th>
            <th class="num">Сума</th>
          </tr>
        </thead>
        <tbody>${getItemRows(invoice.items)}</tbody>
      </table>

      <section class="totals">
        <p><span>Данъчна основа:</span><strong>${formatCurrencyEUR(subtotal)}</strong></p>
        <p><span>ДДС:</span><strong>${formatCurrencyEUR(vatAmount)}</strong></p>
        <p class="total"><span>Общо:</span><span>${formatCurrencyEUR(totalAmount)}</span></p>
      </section>

      ${invoice.notes ? `<h2>Бележки</h2><p>${escapeHtml(invoice.notes)}</p>` : ""}

      <section class="footer">
        <div class="signature">Съставил</div>
        <div class="signature">Получил</div>
      </section>
    `
  };
}

export function getInvoiceDocumentEmailData(invoice) {
  const { title, bodyHtml } = composeInvoiceDocument(invoice);
  return {
    to: invoice?.customerEmail || "",
    subject: title,
    documentLabel: "фактура",
    html: buildDocumentHtml(title, bodyHtml)
  };
}

export function printInvoice(invoice) {
  const { title, bodyHtml } = composeInvoiceDocument(invoice);
  printHtml(title, bodyHtml);
}

function composeOrderDocument(order) {
  const items = order.items?.length ? order.items : [];
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice ?? item.product?.price ?? 0);
    const vatRate = Number(item.vatRate ?? item.product?.vatRate ?? 0);
    const grossAmount = quantity * unitPrice;
    const vatDivider = 1 + vatRate / 100;
    return sum + (vatDivider > 0 ? grossAmount / vatDivider : grossAmount);
  }, 0);
  const vatAmount = items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice ?? item.product?.price ?? 0);
    const vatRate = Number(item.vatRate ?? item.product?.vatRate ?? 0);
    const grossAmount = quantity * unitPrice;
    const vatDivider = 1 + vatRate / 100;
    const lineBase = vatDivider > 0 ? grossAmount / vatDivider : grossAmount;
    return sum + (grossAmount - lineBase);
  }, 0);
  const totalAmount = Number(order.totalAmount ?? subtotal + vatAmount);

  return {
    title: `Продажба ${order.orderNumber || ""}`,
    bodyHtml: `
      <section class="header">
        <div>
          <div class="brand">MARK LIGHT LTD</div>
          <p class="muted">Документ за продажба</p>
        </div>
        <div>
          <h1>ПРОДАЖБА</h1>
          <p><strong>№:</strong> ${escapeHtml(order.orderNumber || "-")}</p>
          <p><strong>Дата:</strong> ${formatDate(order.createdAt)}</p>
        </div>
      </section>
      <section class="grid">
        <div class="box">
          <h2>Клиент</h2>
          <p>${escapeHtml(order.customer?.customerType === "company" ? order.customer?.company || order.customer?.fullName || "Клиент на място" : order.customer?.fullName || order.customer?.company || "Клиент на място")}</p>
        </div>
        <div class="box">
          <h2>Магазин</h2>
          <p>${escapeHtml(order.store?.name || "-")}</p>
          <p>${escapeHtml(order.store?.city || "")}</p>
        </div>
      </section>
      <h2>Артикули</h2>
      <table>
        <thead>
          <tr><th>№</th><th>Продукт</th><th>Мярка</th><th class="num">Кол.</th><th class="num">Ед. цена</th><th class="num">ДДС</th><th class="num">Сума</th></tr>
        </thead>
        <tbody>${getItemRows(items, { priceIncludesVat: true })}</tbody>
      </table>
      <section class="totals">
        <p><span>Сума без ДДС:</span><strong>${formatCurrencyEUR(subtotal)}</strong></p>
        <p><span>ДДС:</span><strong>${formatCurrencyEUR(vatAmount)}</strong></p>
        <p class="total"><span>Общо с ДДС:</span><span>${formatCurrencyEUR(totalAmount)}</span></p>
      </section>
      <section class="footer">
        <div class="signature">Продавач</div>
        <div class="signature">Клиент</div>
      </section>
    `
  };
}

export function getOrderDocumentEmailData(order) {
  const { title, bodyHtml } = composeOrderDocument(order);
  return {
    to: order?.customer?.email || "",
    subject: title,
    documentLabel: "продажба",
    html: buildDocumentHtml(title, bodyHtml)
  };
}

export function printOrder(order) {
  const { title, bodyHtml } = composeOrderDocument(order);
  printHtml(title, bodyHtml);
}

function composeTransferDocument(transfer) {
  const items = transfer.items || [];
  const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const subtotal = items.reduce((sum, item) => {
    const quantityValue = Number(item.quantity || 0);
    const unitPrice = Number(item.product?.price || 0);
    const vatRate = Number(item.product?.vatRate ?? 20);
    const grossAmount = quantityValue * unitPrice;
    const vatDivider = 1 + vatRate / 100;
    return sum + (vatDivider > 0 ? grossAmount / vatDivider : grossAmount);
  }, 0);
  const vatAmount = items.reduce(
    (sum, item) => {
      const quantityValue = Number(item.quantity || 0);
      const unitPrice = Number(item.product?.price || 0);
      const vatRate = Number(item.product?.vatRate ?? 20);
      const grossAmount = quantityValue * unitPrice;
      const vatDivider = 1 + vatRate / 100;
      const lineBase = vatDivider > 0 ? grossAmount / vatDivider : grossAmount;
      return sum + (grossAmount - lineBase);
    },
    0
  );
  const totalAmount = subtotal + vatAmount;

  const transferRows = items
    .map((item, index) => {
      const product = item.product || {};
      const quantityValue = Number(item.quantity || 0);
      const unitPrice = Number(product.price || 0);
      const vatRate = Number(product.vatRate ?? 20);
      const grossAmount = quantityValue * unitPrice;
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(product.name || "-")}</td>
          <td>${escapeHtml(product.productNumber || "-")}</td>
          <td>${escapeHtml(product.sku || "-")}</td>
          <td class="num">${quantityValue}</td>
          <td class="num">${formatCurrencyEUR(unitPrice)}</td>
          <td class="num">${vatRate ? `${vatRate}%` : "-"}</td>
          <td class="num">${formatCurrencyEUR(grossAmount)}</td>
        </tr>
      `;
    })
    .join("");

  return {
    title: `Трансфер ${transfer.transferNumber || ""}`,
    bodyHtml: `
      <section class="header">
        <div>
          <div class="brand">MARK LIGHT LTD</div>
          <p class="muted">Складов трансфер</p>
        </div>
        <div>
          <h1>ТРАНСФЕР</h1>
          <p><strong>№:</strong> ${escapeHtml(transfer.transferNumber || "-")}</p>
          <p><strong>Дата:</strong> ${formatDate(transfer.createdAt)}</p>
        </div>
      </section>
      <section class="grid">
        <div class="box">
          <h2>От магазин</h2>
          <p>${escapeHtml(transfer.fromStore?.name || "-")}</p>
          <p>${escapeHtml(transfer.fromStore?.city || "")}</p>
        </div>
        <div class="box">
          <h2>Към магазин</h2>
          <p>${escapeHtml(transfer.toStore?.name || "-")}</p>
          <p>${escapeHtml(transfer.toStore?.city || "")}</p>
        </div>
      </section>
      <h2>Артикули</h2>
      <table>
        <thead>
          <tr><th>№</th><th>Продукт</th><th>Номер</th><th>SKU</th><th class="num">Кол.</th><th class="num">Ед. цена</th><th class="num">ДДС</th><th class="num">Сума</th></tr>
        </thead>
        <tbody>${transferRows}</tbody>
      </table>
      <section class="totals">
        <p><span>Общо бройки:</span><strong>${quantity}</strong></p>
        <p><span>Сума без ДДС:</span><strong>${formatCurrencyEUR(subtotal)}</strong></p>
        <p><span>ДДС:</span><strong>${formatCurrencyEUR(vatAmount)}</strong></p>
        <p class="total"><span>Общо с ДДС:</span><span>${formatCurrencyEUR(totalAmount)}</span></p>
      </section>
      <h2>Детайли</h2>
      <p><strong>Заявил:</strong> ${escapeHtml(transfer.requestedBy || "-")}</p>
      <p><strong>Статус:</strong> ${escapeHtml(transfer.status || "-")}</p>
      ${transfer.notes ? `<p><strong>Бележки:</strong> ${escapeHtml(transfer.notes)}</p>` : ""}
      <section class="footer">
        <div class="signature">Предал</div>
        <div class="signature">Приел</div>
      </section>
    `
  };
}

export function getTransferDocumentEmailData(transfer) {
  const { title, bodyHtml } = composeTransferDocument(transfer);
  return {
    subject: title,
    documentLabel: "трансфер",
    html: buildDocumentHtml(title, bodyHtml)
  };
}

export function printTransfer(transfer) {
  const { title, bodyHtml } = composeTransferDocument(transfer);
  printHtml(title, bodyHtml);
}

export async function exportTransferPdf(transfer) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const companyLogoUrl = new URL("/MARK%20LIGHT.png", window.location.origin).toString();
  const logoDataUrl = await loadImageAsDataUrl(companyLogoUrl);

  let y = margin;

  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "PNG", margin, y, 18, 18);
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("MARK LIGHT", margin + 24, y + 7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("LIGHTING TRADE", margin + 24, y + 13);

  y += 24;
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("ДОКУМЕНТ ЗА ТРАНСФЕР", margin, y);
  y += 8;

  const totals = (transfer.items || []).reduce(
    (acc, item) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.product?.price || 0);
      const gross = quantity * price;
      return {
        quantity: acc.quantity + quantity,
        total: acc.total + gross
      };
    },
    { quantity: 0, total: 0 }
  );

  const infoLines = [
    `Номер: ${transfer.transferNumber || "-"}`,
    `Дата: ${formatDate(transfer.createdAt)}`,
    `Статус: ${transfer.status || "-"}`,
    `От: ${transfer.fromStore?.name || "-"} | ${transfer.fromStore?.city || ""}`,
    `Към: ${transfer.toStore?.name || "-"} | ${transfer.toStore?.city || ""}`,
    `Заявил: ${transfer.requestedBy || "-"}`
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  infoLines.forEach((line) => {
    pdf.text(line, margin, y);
    y += 5;
  });

  y += 3;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  const columns = [
    { label: "№", x: margin, width: 10 },
    { label: "Продукт", x: margin + 10, width: 58 },
    { label: "Номер", x: margin + 68, width: 28 },
    { label: "SKU", x: margin + 96, width: 28 },
    { label: "Кол.", x: margin + 124, width: 16 },
    { label: "Цена", x: margin + 140, width: 24 },
    { label: "Сума", x: margin + 164, width: 28 }
  ];
  columns.forEach((column) => pdf.text(column.label, column.x, y));
  y += 3;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  (transfer.items || []).forEach((item, index) => {
    if (y > pageHeight - 20) {
      pdf.addPage();
      y = margin;
    }

    const product = item.product || {};
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(product.price || 0);
    const lineTotal = quantity * unitPrice;
    const values = [
      String(index + 1),
      String(product.name || "-").slice(0, 30),
      String(product.productNumber || "-").slice(0, 14),
      String(product.sku || "-").slice(0, 14),
      String(quantity),
      formatCurrencyEUR(unitPrice),
      formatCurrencyEUR(lineTotal)
    ];

    columns.forEach((column, valueIndex) => {
      const alignRight = valueIndex >= 4;
      pdf.text(values[valueIndex], alignRight ? column.x + column.width : column.x, y, { align: alignRight ? "right" : "left" });
    });
    y += 5;
  });

  y += 4;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;
  pdf.setFont("helvetica", "bold");
  pdf.text(`Общо бройки: ${totals.quantity}`, margin, y);
  pdf.text(`Обща стойност: ${formatCurrencyEUR(totals.total)}`, pageWidth - margin, y, { align: "right" });

  if (transfer.notes) {
    y += 10;
    pdf.setFont("helvetica", "bold");
    pdf.text("Бележки:", margin, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    const wrappedNotes = pdf.splitTextToSize(String(transfer.notes), pageWidth - margin * 2);
    pdf.text(wrappedNotes, margin, y);
  }

  pdf.save(`transfer-${transfer.transferNumber || transfer._id || "document"}.pdf`);
}

export function printVatReport(data) {
  const summary = data?.summary || {};
  const rows = (data?.monthlyBreakdown || [])
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.month)}</td>
          <td class="num">${Number(row.count || 0)}</td>
          <td class="num">${formatCurrencyEUR(row.subtotal || 0)}</td>
          <td class="num">${formatCurrencyEUR(row.vatAmount || 0)}</td>
          <td class="num">${formatCurrencyEUR(row.totalAmount || 0)}</td>
        </tr>
      `
    )
    .join("");

  printHtml(
    "ДДС справка",
    `
      <section class="header">
        <div>
          <div class="brand">MARK LIGHT LTD</div>
          <p class="muted">ДДС отчетност</p>
        </div>
        <div>
          <h1>ДДС СПРАВКА</h1>
          <p><strong>Дата:</strong> ${formatDate(new Date())}</p>
        </div>
      </section>
      <section class="grid">
        <div class="box"><h2>Данъчна основа</h2><p><strong>${formatCurrencyEUR(summary.subtotal || 0)}</strong></p></div>
        <div class="box"><h2>ДДС</h2><p><strong>${formatCurrencyEUR(summary.vatAmount || 0)}</strong></p></div>
        <div class="box"><h2>Обща стойност</h2><p><strong>${formatCurrencyEUR(summary.totalAmount || 0)}</strong></p></div>
        <div class="box"><h2>Фактури</h2><p><strong>${Number(summary.invoiceCount || 0)}</strong></p></div>
      </section>
      <h2>Месечна разбивка</h2>
      <table>
        <thead>
          <tr><th>Месец</th><th class="num">Фактури</th><th class="num">Данъчна основа</th><th class="num">ДДС</th><th class="num">Общо</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `
  );
}

export function printInventoryAudit(audit) {
  const lines = Array.isArray(audit?.lines) ? audit.lines : [];
  const rows = lines
    .map((line, index) => {
      const productName = line?.product?.name || "-";
      const sku = line?.product?.sku || "-";
      const expected = Number(line?.expectedQuantity || 0);
      const counted = Number(line?.countedQuantity || 0);
      const diff = counted - expected;
      const reason = line?.reasonCode || "-";
      const note = line?.note || "";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(productName)}</td>
          <td>${escapeHtml(sku)}</td>
          <td class="num">${expected}</td>
          <td class="num">${counted}</td>
          <td class="num">${diff}</td>
          <td>${escapeHtml(reason)}</td>
          <td>${escapeHtml(note)}</td>
        </tr>
      `;
    })
    .join("");

  const countedLines = lines.filter((line) => line?.isCounted).length;
  const diffLines = lines.filter((line) => Number(line?.differenceQuantity || 0) !== 0).length;
  const totalExpected = lines.reduce((sum, line) => sum + Number(line?.expectedQuantity || 0), 0);
  const totalCounted = lines.reduce((sum, line) => sum + Number(line?.countedQuantity || 0), 0);
  const totalDiff = totalCounted - totalExpected;

  printHtml(
    `Ревизия ${audit?.auditNumber || ""}`,
    `
      <section class="header">
        <div>
          <div class="brand">MARK LIGHT LTD</div>
          <p class="muted">Протокол ревизия</p>
        </div>
        <div>
          <h1>РЕВИЗИОНЕН ПРОТОКОЛ</h1>
          <p><strong>№:</strong> ${escapeHtml(audit?.auditNumber || "-")}</p>
          <p><strong>Дата:</strong> ${formatDate(audit?.updatedAt || audit?.createdAt)}</p>
          <p><strong>Статус:</strong> ${escapeHtml(audit?.status || "-")}</p>
        </div>
      </section>

      <section class="grid">
        <div class="box">
          <h2>Локация</h2>
          <p><strong>Магазин:</strong> ${escapeHtml(audit?.store?.name || "-")}</p>
          <p><strong>Град:</strong> ${escapeHtml(audit?.store?.city || "-")}</p>
          <p><strong>Зона:</strong> ${escapeHtml(audit?.zone || "-")}</p>
        </div>
        <div class="box">
          <h2>Обобщение</h2>
          <p><strong>Редове:</strong> ${lines.length}</p>
          <p><strong>Преброени редове:</strong> ${countedLines}</p>
          <p><strong>Редове с разлика:</strong> ${diffLines}</p>
          <p><strong>Общо разлика:</strong> ${totalDiff}</p>
        </div>
      </section>

      <h2>Редове ревизия</h2>
      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Продукт</th>
            <th>SKU</th>
            <th class="num">Налично (по система)</th>
            <th class="num">Преброено</th>
            <th class="num">Разлика</th>
            <th>Причина</th>
            <th>Бележка</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <section class="totals">
        <p><span>Общо по система:</span><strong>${totalExpected}</strong></p>
        <p><span>Общо преброено:</span><strong>${totalCounted}</strong></p>
        <p class="total"><span>Крайна разлика:</span><span>${totalDiff}</span></p>
      </section>
    `
  );
}

function composeSupplierOrderDocument(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);

  const rows = items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.product?.name || "-")}</td>
          <td>${escapeHtml(item.product?.productNumber || "-")}</td>
          <td>${escapeHtml(item.product?.sku || "-")}</td>
          <td class="num">${Number(item.quantity || 0)}</td>
          <td class="num">${formatCurrencyEUR(item.unitCost || 0)}</td>
          <td class="num">${formatCurrencyEUR(Number(item.quantity || 0) * Number(item.unitCost || 0))}</td>
        </tr>
      `
    )
    .join("");

  return {
    title: `Поръчка към доставчик ${order?.orderNumber || ""}`,
    bodyHtml: `
      <section class="header">
        <div>
          <div class="brand">MARK LIGHT LTD</div>
          <p class="muted">Поръчка към доставчик</p>
        </div>
        <div>
          <h1>ПОРЪЧКА КЪМ ДОСТАВЧИК</h1>
          <p><strong>№:</strong> ${escapeHtml(order?.orderNumber || "-")}</p>
          <p><strong>Дата:</strong> ${formatDate(order?.orderedAt || order?.createdAt)}</p>
          <p><strong>Статус:</strong> ${escapeHtml(order?.status || "-")}</p>
        </div>
      </section>

      <section class="grid">
        <div class="box">
          <h2>Доставчик</h2>
          <p><strong>${escapeHtml(order?.supplier?.name || "-")}</strong></p>
          <p>${escapeHtml(order?.supplier?.address || "")}</p>
          <p>Лице: ${escapeHtml(order?.supplier?.contactPerson || "-")}</p>
          <p>Телефон: ${escapeHtml(order?.supplier?.phone || "-")}</p>
          <p>Email: ${escapeHtml(order?.supplier?.email || "-")}</p>
        </div>
        <div class="box">
          <h2>Получаване</h2>
          <p><strong>Обект:</strong> ${escapeHtml(order?.store?.name || "-")}</p>
          <p><strong>Град:</strong> ${escapeHtml(order?.store?.city || "-")}</p>
          <p><strong>Заявил:</strong> ${escapeHtml(order?.requestedBy || "-")}</p>
          <p><strong>Очаквана дата:</strong> ${formatDate(order?.expectedDate)}</p>
        </div>
      </section>

      <h2>Артикули</h2>
      <table>
        <thead>
          <tr><th>№</th><th>Продукт</th><th>Номер</th><th>SKU</th><th class="num">Кол.</th><th class="num">Ед. цена</th><th class="num">Сума</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <section class="totals">
        <p><span>Общо бройки:</span><strong>${totalQuantity}</strong></p>
        <p class="total"><span>Обща стойност:</span><span>${formatCurrencyEUR(totalAmount)}</span></p>
      </section>

      ${order?.notes ? `<h2>Бележки</h2><p>${escapeHtml(order.notes)}</p>` : ""}

      <section class="footer">
        <div class="signature">Заявил</div>
        <div class="signature">Доставчик</div>
      </section>
    `
  };
}

export function getSupplierOrderDocumentEmailData(order) {
  const { title, bodyHtml } = composeSupplierOrderDocument(order);
  return {
    to: order?.supplier?.email || "",
    subject: title,
    documentLabel: "поръчка към доставчик",
    html: buildDocumentHtml(title, bodyHtml)
  };
}

export function printSupplierOrder(order) {
  const { title, bodyHtml } = composeSupplierOrderDocument(order);
  printHtml(title, bodyHtml);
}

export async function exportSupplierOrderPdf(order) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const companyLogoUrl = new URL("/MARK%20LIGHT.png", window.location.origin).toString();
  const logoDataUrl = await loadImageAsDataUrl(companyLogoUrl);

  let y = margin;
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "PNG", margin, y, 18, 18);
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("MARK LIGHT", margin + 24, y + 7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("LIGHTING TRADE", margin + 24, y + 13);
  y += 24;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("ПОРЪЧКА КЪМ ДОСТАВЧИК", margin, y);
  y += 8;

  const infoLines = [
    `Номер: ${order?.orderNumber || "-"}`,
    `Доставчик: ${order?.supplier?.name || "-"}`,
    `Обект: ${order?.store?.name || "-"}`,
    `Заявил: ${order?.requestedBy || "-"}`,
    `Очаквана дата: ${formatDate(order?.expectedDate)}`,
    `Статус: ${order?.status || "-"}`
  ];
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  infoLines.forEach((line) => {
    pdf.text(line, margin, y);
    y += 5;
  });

  y += 3;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  const columns = [
    { label: "№", x: margin, width: 10 },
    { label: "Продукт", x: margin + 10, width: 56 },
    { label: "Номер", x: margin + 66, width: 28 },
    { label: "SKU", x: margin + 94, width: 28 },
    { label: "Кол.", x: margin + 122, width: 16 },
    { label: "Цена", x: margin + 138, width: 24 },
    { label: "Сума", x: margin + 162, width: 28 }
  ];
  columns.forEach((column) => pdf.text(column.label, column.x, y));
  y += 3;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  let totalAmount = 0;
  let totalQuantity = 0;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  (order?.items || []).forEach((item, index) => {
    if (y > pageHeight - 20) {
      pdf.addPage();
      y = margin;
    }
    const quantity = Number(item.quantity || 0);
    const unitCost = Number(item.unitCost || 0);
    const lineTotal = quantity * unitCost;
    totalQuantity += quantity;
    totalAmount += lineTotal;
    const product = item.product || {};
    const values = [
      String(index + 1),
      String(product.name || "-").slice(0, 28),
      String(product.productNumber || "-").slice(0, 14),
      String(product.sku || "-").slice(0, 14),
      String(quantity),
      formatCurrencyEUR(unitCost),
      formatCurrencyEUR(lineTotal)
    ];
    columns.forEach((column, valueIndex) => {
      const alignRight = valueIndex >= 4;
      pdf.text(values[valueIndex], alignRight ? column.x + column.width : column.x, y, { align: alignRight ? "right" : "left" });
    });
    y += 5;
  });

  y += 4;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;
  pdf.setFont("helvetica", "bold");
  pdf.text(`Общо бройки: ${totalQuantity}`, margin, y);
  pdf.text(`Обща стойност: ${formatCurrencyEUR(totalAmount)}`, pageWidth - margin, y, { align: "right" });
  pdf.save(`supplier-order-${order?.orderNumber || order?._id || "document"}.pdf`);
}
