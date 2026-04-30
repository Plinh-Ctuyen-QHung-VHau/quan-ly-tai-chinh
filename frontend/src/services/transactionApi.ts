import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { invalidateData } from "../utils/dataInvalidation";
import { Category } from "../types/category";
import { endpoints } from "./endpoints";
import {
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  TransactionFilters,
  TransactionListResponse,
  TransactionSummary,
} from "../types/transaction";

type TransactionSummaryApiResponse = {
  total_income?: number;
  total_expense?: number;
  total_income?: number;
  total_expense?: number;
  balance?: number;
  currency?: string;
};

function normalizeTransactionSummary(
  payload: TransactionSummaryApiResponse,
): TransactionSummary {
  return {
    total_income: Number(payload.total_income ?? payload.total_income ?? 0),
    total_expense: Number(payload.total_expense ?? payload.total_expense ?? 0),
    balance: Number(payload.balance ?? 0),
  };
}

export async function getTransactionSummary() {
  const response = await apiClient.get(endpoints.transactions.summary);
  const payload = handleApiResponse<TransactionSummaryApiResponse>(response);
  return normalizeTransactionSummary(payload);
}

export async function getTransactions(filters: TransactionFilters = {}) {
  const { category_id, ...restFilters } = filters;
  const response = await apiClient.get(endpoints.transactions.list, {
    params: {
      ...restFilters,
      ...(category_id ? { category_id: category_id } : {}),
    },
  });
  return handleApiResponse<TransactionListResponse>(response);
}

export async function getTransactionById(id: string) {
  const response = await apiClient.get(endpoints.transactions.detail(id));
  return handleApiResponse<Transaction>(response);
}

export async function createTransaction(payload: CreateTransactionPayload) {
  const response = await apiClient.post(endpoints.transactions.create, payload);
  const result = handleApiResponse<Transaction>(response);
  invalidateData("transactions");
  invalidateData("transactionSummary");
  invalidateData("budget");
  return result;
}

export async function updateTransaction(
  id: string,
  payload: UpdateTransactionPayload,
) {
  const response = await apiClient.put(
    endpoints.transactions.update(id),
    payload,
  );
  const result = handleApiResponse<Transaction>(response);
  invalidateData("transactions");
  invalidateData("transactionSummary");
  invalidateData("budget");
  return result;
}

export async function deleteTransaction(id: string) {
  const response = await apiClient.delete(endpoints.transactions.remove(id));
  const result = handleApiResponse<{ id: string }>(response);
  invalidateData("transactions");
  invalidateData("transactionSummary");
  invalidateData("budget");
  return result;
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
