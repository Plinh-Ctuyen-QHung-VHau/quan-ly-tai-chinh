import { budget_period } from "../types/budget";

export function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

export function validatePassword(value: string) {
  return value.trim().length >= 6;
}

export function isPositiveAmount(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return isFinite(parsed) && parsed > 0;
}

export function validatebudget_period(value: string): value is budget_period {
  return value === "weekly" || value === "monthly";
}

export function requiredMessage(label: string) {
  return `${label} không được để trống.`;
}
