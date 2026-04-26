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

export async function getTransactionSummary() {
  const response = await apiClient.get(endpoints.transactions.summary);
  return handleApiResponse<TransactionSummary>(response);
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
