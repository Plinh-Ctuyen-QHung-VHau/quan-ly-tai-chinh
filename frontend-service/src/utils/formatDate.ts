export function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
}
