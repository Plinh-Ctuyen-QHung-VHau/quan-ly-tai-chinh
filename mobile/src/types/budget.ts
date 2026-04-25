export type BudgetPeriod = "weekly" | "monthly";

export interface Budget {
  id: string;
  budgetAmount: number;
  budgetPeriod: BudgetPeriod;
  startDate: string;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetStatus {
  id?: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentUsed: number;
  status: "healthy" | "warning" | "danger" | "no-budget";
  budgetPeriod?: BudgetPeriod | null;
  startDate?: string | null;
  endDate?: string | null;
}
