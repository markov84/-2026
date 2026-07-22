export function formatCurrencyEUR(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)} €`;
}

export function formatDate(dateValue) {
  if (!dateValue) return "-";
  try {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  } catch {
    return "-";
  }
}

export function formatDateTime(dateValue) {
  if (!dateValue) return "-";
  try {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";
    const datePart = formatDate(date);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${datePart} ${hours}:${minutes}`;
  } catch {
    return "-";
  }
}
