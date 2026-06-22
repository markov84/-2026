export function formatCurrencyEUR(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)} €`;
}
