import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { Budget, BudgetStatus } from "../types/budget";

export async function getCurrentBudgetStatus() {
  const response = await apiClient.get("/api/budgets/current/status");
  return handleApiResponse<BudgetStatus>(response);
}

export async function createBudget(
  payload: Omit<Budget, "id" | "createdAt" | "updatedAt">,
) {
  const response = await apiClient.post("/api/budgets", payload);
  return handleApiResponse<Budget>(response);
}

export async function updateBudget(id: string, payload: Partial<Budget>) {
  const response = await apiClient.put(`/api/budgets/${id}`, payload);
  return handleApiResponse<Budget>(response);
}

export async function deleteBudget(id: string) {
  const response = await apiClient.delete(`/api/budgets/${id}`);
  return handleApiResponse<{ id: string }>(response);
}
