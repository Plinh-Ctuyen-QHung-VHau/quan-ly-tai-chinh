export interface TransactionHistoryItem {
  id: string;
  type: string;
  amount: number;
  note?: string | null;
  merchant_name?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
}

export interface TransactionHistoryDay {
  date: string;
  transactions: TransactionHistoryItem[];
}

export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  balance: number;
}

export interface BudgetStatus {
  id: string;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percent_used: number;
  status: "healthy" | "warning" | "danger";
  budget_period: string;
  start_date: string | Date;
  end_date: string | Date;
}
