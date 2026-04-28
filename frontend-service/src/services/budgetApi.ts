import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { Budget, budget_period, BudgetStatus } from "../types/budget";
import { endpoints } from "./endpoints";

export type CreateBudgetPayload = {
  budget_amount: number;
  budget_period: budget_period;
  start_date: string;
  end_date: string; // NOT NULL in DB — required
};

export type UpdateBudgetPayload = Partial<CreateBudgetPayload>;

export async function getCurrentBudgetStatus(): Promise<BudgetStatus | null> {
  try {
    const response = await apiClient.get(endpoints.budgets.currentStatus);
    return handleApiResponse<BudgetStatus>(response);
  } catch (error: any) {
    const status = error?.statusCode ?? error?.response?.status;

    if (status === 404) {
      return null;
    }

    throw error;
  }
}

export async function createBudget(payload: CreateBudgetPayload) {
  const response = await apiClient.post(endpoints.budgets.create, payload);
  return handleApiResponse<Budget>(response);
}

export async function updateBudget(id: string, payload: UpdateBudgetPayload) {
  const response = await apiClient.put(endpoints.budgets.update(id), payload);
  return handleApiResponse<Budget>(response);
}

export async function deleteBudget(id: string) {
  const response = await apiClient.delete(endpoints.budgets.remove(id));
  return handleApiResponse<{ id: string }>(response);
}