export type budget_period = "weekly" | "monthly";

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
