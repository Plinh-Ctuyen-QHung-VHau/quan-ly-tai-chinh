import { formatDate as sharedFormatDate } from "./formatters";

export function formatDate(value?: string | null) {
  return sharedFormatDate(value);
}
