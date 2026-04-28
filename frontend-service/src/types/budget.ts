export type BudgetPeriod = "weekly" | "monthly";

export interface Budget {
  id: string;
  budget_amount: number;
  budget_period: BudgetPeriod;
  start_date: string;
  end_date?: string | null;
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
  budget_period?: BudgetPeriod | null;
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
