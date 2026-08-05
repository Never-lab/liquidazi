export const formatCash = (amount: number): string =>
  amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
