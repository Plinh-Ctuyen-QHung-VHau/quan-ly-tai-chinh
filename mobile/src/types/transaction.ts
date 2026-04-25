import { Category, TransactionType } from "./category";

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
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  currency?: string;
}

export interface TransactionFilters {
  type?: TransactionType | "all";
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
}
