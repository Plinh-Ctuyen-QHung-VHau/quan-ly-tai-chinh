import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { Category } from "../types/category";
import {
  Transaction,
  TransactionFilters,
  TransactionListResponse,
  TransactionSummary,
} from "../types/transaction";

export async function getTransactionSummary() {
  const response = await apiClient.get("/api/transactions/summary");
  return handleApiResponse<TransactionSummary>(response);
}

export async function getTransactions(filters: TransactionFilters = {}) {
  const response = await apiClient.get("/api/transactions", {
    params: filters,
  });
  return handleApiResponse<TransactionListResponse>(response);
}

export async function getTransactionById(id: string) {
  const response = await apiClient.get(`/api/transactions/${id}`);
  return handleApiResponse<Transaction>(response);
}

export async function createTransaction(payload: Partial<Transaction>) {
  const response = await apiClient.post("/api/transactions", payload);
  return handleApiResponse<Transaction>(response);
}

export async function updateTransaction(
  id: string,
  payload: Partial<Transaction>,
) {
  const response = await apiClient.put(`/api/transactions/${id}`, payload);
  return handleApiResponse<Transaction>(response);
}

export async function deleteTransaction(id: string) {
  const response = await apiClient.delete(`/api/transactions/${id}`);
  return handleApiResponse<{ id: string }>(response);
}

export async function getCategories(type: "income" | "expense") {
  const response = await apiClient.get("/api/categories", {
    params: { type },
  });
  return handleApiResponse<Category[]>(response);
}
