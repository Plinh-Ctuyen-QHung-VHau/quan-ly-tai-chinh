export type budget_period = "weekly" | "monthly";
/** Alias for budget_period — used in API response normalization */
export type BudgetPeriod = budget_period;

export interface Budget {
  id: string;
  budget_amount: number;
  budget_period: budget_period;
  start_date: string;
  end_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetStatus {
  id?: string;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percent_used: number;
  status: "healthy" | "warning" | "danger" | "no-budget";
  budget_period?: budget_period | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface BudgetStatusApiResponse {
  id?: string;
  budgetId?: string;
  budget_amount: number;
  spent_amount?: number;
  spentAmount?: number;
  remaining_amount?: number;
  remainingAmount?: number;
  percent_used?: number;
  percentUsed?: number;
  status: BudgetStatus["status"];
  budget_period?: BudgetPeriod | null;
  start_date?: string | null;
  end_date?: string | null;
}
