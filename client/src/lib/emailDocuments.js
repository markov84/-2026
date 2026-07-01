import { formatCurrencyEUR } from "./currency";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("bg-BG");
}

function sanitizeEmail(value) {
  return String(value || "").trim();
}

function composeMailtoUrl({ to = "", subject = "", body = "" }) {
  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);
  const encodedTo = encodeURIComponent(to);
  return `mailto:${encodedTo}?${params.toString()}`;
}

function openDocumentEmail({ to = "", subject = "", body = "" }) {
  const candidate = sanitizeEmail(to) || sanitizeEmail(window.prompt("Въведи имейл адрес на получателя:", ""));
  if (!candidate) return false;

  const mailtoUrl = composeMailtoUrl({
    to: candidate,
    subject,
    body
  });

  window.location.href = mailtoUrl;
  return true;
}

export function sendOrderByEmail(order) {
  if (!order) return false;

  const totalAmount = Number(order.totalAmount || 0);
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const subject = `Поръчка ${order.orderNumber || ""}`.trim();
  const body = [
    "Здравейте,",
    "",
    "Изпращаме Ви документ за поръчка/продажба.",
    `Номер: ${order.orderNumber || "-"}`,
    `Дата: ${formatDate(order.createdAt || order.updatedAt)}`,
    `Клиент: ${order.customer?.fullName || order.customer?.company || "-"}`,
    `Обект: ${order.store?.name || "-"}`,
    `Продукти: ${itemCount}`,
    `Обща стойност: ${formatCurrencyEUR(totalAmount)}`,
    "",
    "Поздрави,",
    "MARKLIGHT"
  ].join("\n");

  return openDocumentEmail({
    to: sanitizeEmail(order.customer?.email),
    subject,
    body
  });
}

export function sendTransferByEmail(transfer) {
  if (!transfer) return false;

  const totalAmount = Number(transfer.totalAmount || 0);
  const totalQuantity = Number(transfer.totalQuantity || 0);
  const subject = `Трансфер ${transfer.transferNumber || ""}`.trim();
  const body = [
    "Здравейте,",
    "",
    "Изпращаме Ви документ за вътрешен трансфер.",
    `Номер: ${transfer.transferNumber || "-"}`,
    `Дата: ${formatDate(transfer.createdAt || transfer.updatedAt)}`,
    `От обект: ${transfer.fromStore?.name || "-"}`,
    `Към обект: ${transfer.toStore?.name || "-"}`,
    `Заявил: ${transfer.requestedBy || "-"}`,
    `Бройки: ${totalQuantity}`,
    `Стойност: ${formatCurrencyEUR(totalAmount)}`,
    "",
    "Поздрави,",
    "MARKLIGHT"
  ].join("\n");

  return openDocumentEmail({ subject, body });
}

export function sendInvoiceByEmail(invoice) {
  if (!invoice) return false;

  const totalAmount = Number(invoice.totalAmount || 0);
  const subject = `Фактура ${invoice.invoiceNumber || ""}`.trim();
  const body = [
    "Здравейте,",
    "",
    "Изпращаме Ви издадена фактура.",
    `Номер: ${invoice.invoiceNumber || "-"}`,
    `Дата: ${formatDate(invoice.issueDate || invoice.createdAt)}`,
    `Получател: ${invoice.customerName || "-"}`,
    `ЕИК/ДДС: ${invoice.customerVatNumber || invoice.customerIdNumber || "-"}`,
    `Стойност: ${formatCurrencyEUR(totalAmount)}`,
    "",
    "Поздрави,",
    "MARKLIGHT"
  ].join("\n");

  return openDocumentEmail({ subject, body });
}

export function sendSupplierOrderByEmail(order) {
  if (!order) return false;

  const totalAmount = Number(order.totalAmount || 0);
  const totalQuantity = Number(order.totalQuantity || 0);
  const subject = `Поръчка към доставчик ${order.orderNumber || ""}`.trim();
  const body = [
    "Здравейте,",
    "",
    "Изпращаме Ви поръчка към доставчик.",
    `Номер: ${order.orderNumber || "-"}`,
    `Дата: ${formatDate(order.orderedAt || order.createdAt)}`,
    `Доставчик: ${order.supplier?.name || "-"}`,
    `Обект за доставка: ${order.store?.name || "-"}`,
    `Заявил: ${order.requestedBy || "-"}`,
    `Общо бройки: ${totalQuantity}`,
    `Обща стойност: ${formatCurrencyEUR(totalAmount)}`,
    "",
    "Поздрави,",
    "MARKLIGHT"
  ].join("\n");

  return openDocumentEmail({
    to: sanitizeEmail(order.supplier?.email),
    subject,
    body
  });
}

export function sendInventoryAuditByEmail(audit) {
  if (!audit) return false;

  const lines = Array.isArray(audit.lines) ? audit.lines : [];
  const totalDiff = lines.reduce((sum, line) => sum + Number(line?.differenceQuantity || 0), 0);
  const subject = `Ревизионен протокол ${audit.auditNumber || ""}`.trim();
  const body = [
    "Здравейте,",
    "",
    "Изпращаме Ви ревизионен протокол.",
    `Номер: ${audit.auditNumber || "-"}`,
    `Дата: ${formatDate(audit.updatedAt || audit.createdAt)}`,
    `Обект: ${audit.store?.name || "-"}`,
    `Статус: ${audit.status || "-"}`,
    `Редове: ${lines.length}`,
    `Крайна разлика: ${totalDiff}`,
    "",
    "Поздрави,",
    "MARKLIGHT"
  ].join("\n");

  return openDocumentEmail({ subject, body });
}
