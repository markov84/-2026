export function formatCurrencyEUR(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)} €`;
}

export function formatDate(dateValue) {
  if (!dateValue) return "-";
  try {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("bg-BG", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "-";
  }
}

export function formatDateTime(dateValue) {
  if (!dateValue) return "-";
  try {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("bg-BG", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "-";
  }
}
