import { TransactionType } from "./category";

export type TransactionSource = "camera" | "gallery" | "chatbot";

export interface Transaction {
  id: string;
  user_id?: string;
  amount: number;
  type: TransactionType;
  category_id: string;
  category_name?: string | null;
  category_icon?: string | null;

  note?: string | null;
  transaction_date: string;
  merchant_name?: string | null;
  image_url?: string | null;
  is_anomaly?: boolean;
  anomaly_score?: number | null;
  ocr_result_id?: string | null;
  source?: TransactionSource | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTransactionPayload {
  amount: number;
  type: TransactionType;
  category_id: string;
  transaction_date: string;
  source: TransactionSource;
  note?: string;
  image_url?: string;
  merchant_name?: string;
  ocr_result_id?: string;
}

export type UpdateTransactionPayload = Partial<CreateTransactionPayload>;

export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  balance: number;
}

export interface TransactionFilters {
  type?: TransactionType;
  category_id?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  data: Transaction[];
  meta: import("./api").PaginatedMeta | null;
}
