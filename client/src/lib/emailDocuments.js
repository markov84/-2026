import { formatCurrencyEUR } from "./currency";
import api from "./api";
import toast from "react-hot-toast";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("bg-BG");
}

function sanitizeEmail(value) {
  return String(value || "").trim();
}

function askRecipientEmail(defaultEmail = "") {
  return sanitizeEmail(window.prompt("Въведи имейл адрес на получателя:", defaultEmail));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

async function sendDocumentEmail({ to = "", subject = "", body = "", successMessage = "Имейлът е изпратен." }) {
  const recipient = sanitizeEmail(to) || askRecipientEmail("");
  if (!recipient) {
    toast.error("Не е въведен имейл адрес.");
    return false;
  }

  if (!isValidEmail(recipient)) {
    toast.error("Невалиден имейл адрес.");
    return false;
  }

  try {
    await api.post("/emails/send-document", {
      to: recipient,
      subject,
      text: body
    });
    toast.success(successMessage);
    return true;
  } catch (error) {
    const details = error?.response?.data?.details;
    toast.error(details || error?.response?.data?.message || "Грешка при изпращане на имейл.");
    return false;
  }
}

export async function sendOrderByEmail(order) {
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

  return sendDocumentEmail({
    to: sanitizeEmail(order.customer?.email),
    subject,
    body,
    successMessage: "Поръчката е изпратена по имейл."
  });
}

export async function sendTransferByEmail(transfer) {
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

  return sendDocumentEmail({
    subject,
    body,
    successMessage: "Трансферът е изпратен по имейл."
  });
}

export async function sendInvoiceByEmail(invoice) {
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

  return sendDocumentEmail({
    to: sanitizeEmail(invoice.customerEmail),
    subject,
    body,
    successMessage: "Фактурата е изпратена по имейл."
  });
}

export async function sendSupplierOrderByEmail(order) {
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

  return sendDocumentEmail({
    to: sanitizeEmail(order.supplier?.email),
    subject,
    body,
    successMessage: "Поръчката към доставчик е изпратена по имейл."
  });
}

export async function sendInventoryAuditByEmail(audit) {
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

  return sendDocumentEmail({
    subject,
    body,
    successMessage: "Ревизионният протокол е изпратен по имейл."
  });
}
