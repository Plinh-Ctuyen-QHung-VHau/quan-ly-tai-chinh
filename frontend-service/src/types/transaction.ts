import { TransactionType } from "./category";

export type TransactionSource = "camera" | "gallery";
export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category_id: string;
  categoryName?: string | null;
  note?: string | null;
  transaction_date: string;
  merchant_name?: string | null;
  image_url?: string | null;
  is_anomaly?: boolean;
  created_at?: string;
  updated_at?: string;
  source?: TransactionSource | null;
}

export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  currency?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  category_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  items: Transaction[];
  meta: import("./api").PaginatedMeta | null;
}

export interface TransactionDraft {
  amount: number;
  type: TransactionType;
  category_id: string;
  note?: string;
  transaction_date: string;
  merchant_name?: string;
  image_url?: string;
  source: TransactionSource;
}
