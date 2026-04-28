import { Platform } from "react-native";

export const transactionTypeOptions = [
  { label: "Chi tiêu", value: "expense" },
  { label: "Thu nhập", value: "income" },
] as const;

export const budget_periodOptions = [
  { label: "Theo tuần", value: "weekly" },
  { label: "Theo tháng", value: "monthly" },
] as const;

export const source_typeOptions = [
  { label: "Camera", value: "camera" },
  { label: "Thư viện ảnh", value: "gallery" },
] as const;

export const isWeb = Platform.OS === "web";
