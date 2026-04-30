import { formatCurrency as sharedFormatCurrency } from "./formatters";

export function formatCurrency(value: number) {
  return sharedFormatCurrency(value);
}
