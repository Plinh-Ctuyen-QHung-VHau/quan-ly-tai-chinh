import { Platform } from "react-native";

export const transactionTypeOptions = [
  { label: "Chi tiêu", value: "expense" },
  { label: "Thu nhập", value: "income" },
] as const;

export const budgetPeriodOptions = [
  { label: "Theo tuần", value: "weekly" },
  { label: "Theo tháng", value: "monthly" },
] as const;

export const sourceTypeOptions = [
  { label: "Camera", value: "camera" },
  { label: "Thư viện ảnh", value: "gallery" },
] as const;

export const isWeb = Platform.OS === "web";
