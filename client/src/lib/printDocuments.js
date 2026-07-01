import { formatCurrencyEUR } from "./currency";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("bg-BG");
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

function printHtml(title, bodyHtml) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const companyLogoUrl = new URL("/MARKLIGHT.png", window.location.origin).toString();

  printWindow.document.write(`
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
            <img class="company-logo" src="${escapeHtml(companyLogoUrl)}" alt="MARKLIGHT logo" />
            <div>
              <div class="company-name">MARKLIGHT</div>
              <div class="company-tagline">LIGHTING TRADE</div>
            </div>
          </section>
          ${bodyHtml}
        </main>
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

export function printInvoice(invoice) {
  const supplier = invoice.supplier || {};
  const subtotal = Number(invoice.subtotal || 0);
  const vatAmount = Number(invoice.vatAmount || 0);
  const totalAmount = Number(invoice.totalAmount || 0);

  printHtml(
    `Фактура ${invoice.invoiceNumber || ""}`,
    `
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
  );
}

export function printOrder(order) {
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

  printHtml(
    `Продажба ${order.orderNumber || ""}`,
    `
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
  );
}

export function printTransfer(transfer) {
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

  printHtml(
    `Трансфер ${transfer.transferNumber || ""}`,
    `
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
  );
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
