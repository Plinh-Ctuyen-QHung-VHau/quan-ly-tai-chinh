export function formatCurrency(value: number, currency = "VND") {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString("vi-VN")} ${currency}`;
  }
}
