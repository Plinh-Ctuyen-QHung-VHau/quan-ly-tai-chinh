import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { Category } from "../types/category";
import { endpoints } from "./endpoints";
import {
  Transaction,
  TransactionFilters,
  TransactionListResponse,
  TransactionSummary,
} from "../types/transaction";

type TransactionSummaryApiResponse = {
  total_income?: number;
  total_expense?: number;
  totalIncome?: number;
  totalExpense?: number;
  balance?: number;
  currency?: string;
};

function normalizeTransactionSummary(
  payload: TransactionSummaryApiResponse,
): TransactionSummary {
  return {
    total_income: Number(payload.total_income ?? payload.totalIncome ?? 0),
    total_expense: Number(payload.total_expense ?? payload.totalExpense ?? 0),
    balance: Number(payload.balance ?? 0),
    currency: payload.currency,
  };
}

export async function getTransactionSummary() {
  const response = await apiClient.get(endpoints.transactions.summary);
  const payload = handleApiResponse<TransactionSummaryApiResponse>(response);
  return normalizeTransactionSummary(payload);
}

export async function getTransactions(filters: TransactionFilters = {}) {
  const response = await apiClient.get(endpoints.transactions.list, {
    params: filters,
  });
  return handleApiResponse<TransactionListResponse>(response);
}

export async function getTransactionById(id: string) {
  const response = await apiClient.get(endpoints.transactions.detail(id));
  return handleApiResponse<Transaction>(response);
}

export async function createTransaction(payload: Partial<Transaction>) {
  const response = await apiClient.post(endpoints.transactions.create, payload);
  return handleApiResponse<Transaction>(response);
}

export async function updateTransaction(
  id: string,
  payload: Partial<Transaction>,
) {
  const response = await apiClient.put(
    endpoints.transactions.update(id),
    payload,
  );
  return handleApiResponse<Transaction>(response);
}

export async function deleteTransaction(id: string) {
  const response = await apiClient.delete(endpoints.transactions.remove(id));
  return handleApiResponse<{ id: string }>(response);
}

export async function getCategories(type: "income" | "expense") {
  try {
    const res = await apiClient.get(endpoints.categories.list(type));
    return Array.isArray(res.data?.data) ? (res.data.data as Category[]) : [];
  } catch (error) {
    console.log("Get categories error", error);
    return [];
  }
}
