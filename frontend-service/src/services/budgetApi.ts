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

    // Budget for current period may not exist yet; treat any 404 as empty state.
    if (status === 404) {
      return null;
    }

    throw error;
  }
}

export async function createBudget(payload: {
  budget_amount: number;
  budget_period: BudgetPeriod;
  start_date: string;
}) {
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
