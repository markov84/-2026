export function formatCurrencyEUR(value) {
  const amount = Number(value || 0);
  return `EURO | € ${amount.toFixed(2)}`;
}
