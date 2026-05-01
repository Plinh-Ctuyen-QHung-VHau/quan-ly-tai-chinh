import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { invalidateData } from "../utils/dataInvalidation";
import {
  Budget,
  budget_period,
  BudgetStatus,
  BudgetStatusApiResponse,
} from "../types/budget";
import { endpoints } from "./endpoints";

export type CreateBudgetPayload = {
  budget_amount: number;
  budget_period: budget_period;
  start_date: string;
  end_date: string; // NOT NULL in DB — required
};

export type UpdateBudgetPayload = Partial<CreateBudgetPayload>;

function normalizeBudgetStatus(
  payload: BudgetStatusApiResponse,
): BudgetStatus {
  return {
    id: payload.id ?? payload.budgetId ?? payload.budget_id,
    budget_amount: Number(payload.budget_amount ?? 0),
    spent_amount: Number(payload.spent_amount ?? payload.spentAmount ?? 0),
    remaining_amount: Number(
      payload.remaining_amount ?? payload.remainingAmount ?? 0,
    ),
    percent_used: Number(payload.percent_used ?? payload.percentUsed ?? 0),
    status: payload.status,
    budget_period: payload.budget_period ?? null,
    start_date: payload.start_date ?? null,
    end_date: payload.end_date ?? null,
  };
}

export async function getCurrentBudgetStatus(): Promise<BudgetStatus | null> {
  try {
    const response = await apiClient.get(endpoints.budgets.currentStatus);
    const payload = handleApiResponse<BudgetStatusApiResponse>(response);
    return normalizeBudgetStatus(payload);
  } catch (error: any) {
    // Kiểm tra statusCode ở mọi vị trí có thể
    const status = 
      error?.statusCode ?? 
      error?.response?.status ?? 
      error?.details?.statusCode ?? 
      error?.error?.details?.statusCode ??
      (error?.details as any)?.statusCode;

    if (status === 404 || error?.code === "NOT_FOUND" || error?.message?.includes("404")) {
      return null;
    }
    throw error;
  }
}

export async function createBudget(payload: CreateBudgetPayload) {
  const response = await apiClient.post(endpoints.budgets.create, payload);
  const result = handleApiResponse<Budget>(response);
  invalidateData("budget");
  return result;
}

export async function updateBudget(id: string, payload: UpdateBudgetPayload) {
  const response = await apiClient.put(endpoints.budgets.update(id), payload);
  const result = handleApiResponse<Budget>(response);
  invalidateData("budget");
  return result;
}

export async function getCurrentBudget(): Promise<Budget | null> {
  try {
    const response = await apiClient.get(endpoints.budgets.current);
    return handleApiResponse<Budget>(response);
  } catch (error: any) {
    const status = error?.statusCode ?? error?.response?.status;

    if (status === 404) {
      return null;
    }

    throw error;
  }
}

export async function deleteBudget(id: string) {
  const response = await apiClient.delete(endpoints.budgets.remove(id));
  const result = handleApiResponse<{ id: string }>(response);
  invalidateData("budget");
  return result;
}