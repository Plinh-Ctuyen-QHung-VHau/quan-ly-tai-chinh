import { TransactionType } from "./category";

export type TransactionSource = "camera" | "gallery";
export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName?: string | null;
  note?: string | null;
  transactionDate: string;
  merchantName?: string | null;
  imageUrl?: string | null;
  isAnomaly?: boolean;
  createdAt?: string;
  updatedAt?: string;
  source?: TransactionSource | null;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  currency?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
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
  categoryId: string;
  note?: string;
  transactionDate: string;
  merchantName?: string;
  imageUrl?: string;
  source: TransactionSource;
}
