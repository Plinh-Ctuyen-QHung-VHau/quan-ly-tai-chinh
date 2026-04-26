import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { Budget, BudgetStatus } from "../types/budget";
import { endpoints } from "./endpoints";

export async function getCurrentBudgetStatus(): Promise<BudgetStatus | null> {
  try {
    const response = await apiClient.get(endpoints.budgets.currentStatus);
    return handleApiResponse<BudgetStatus>(response);
  } catch (error: any) {
    const status = error?.statusCode ?? error?.response?.status;
    const message = error?.message ?? error?.response?.data?.message;

    if (
      status === 404 &&
      message === "No active budget found for the current period."
    ) {
      return null;
    }

    throw error;
  }
}

export async function createBudget(
  payload: Omit<Budget, "id" | "createdAt" | "updatedAt">,
) {
  const response = await apiClient.post(endpoints.budgets.create, payload);
  return handleApiResponse<Budget>(response);
}

export async function updateBudget(id: string, payload: Partial<Budget>) {
  const response = await apiClient.put(endpoints.budgets.update(id), payload);
  return handleApiResponse<Budget>(response);
}

export async function deleteBudget(id: string) {
  const response = await apiClient.delete(endpoints.budgets.remove(id));
  return handleApiResponse<{ id: string }>(response);
}
