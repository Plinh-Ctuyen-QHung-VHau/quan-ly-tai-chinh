import { create } from "zustand";

import { Budget, BudgetStatus } from "../types/budget";

interface BudgetState {
  currentBudget: Budget | null;
  currentBudgetStatus: BudgetStatus | null;
  setCurrentBudget: (budget: Budget | null) => void;
  setCurrentBudgetStatus: (status: BudgetStatus | null) => void;
}

export const useBudgetStore = create<BudgetState>()((set) => ({
  currentBudget: null,
  currentBudgetStatus: null,
  setCurrentBudget: (currentBudget: Budget | null) => set({ currentBudget }),
  setCurrentBudgetStatus: (currentBudgetStatus: BudgetStatus | null) =>
    set({ currentBudgetStatus }),
}));
