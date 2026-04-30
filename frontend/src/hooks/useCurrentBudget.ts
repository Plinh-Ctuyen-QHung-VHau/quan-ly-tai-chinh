import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getCurrentBudgetStatus } from "../services/budgetApi";
import { BudgetStatus } from "../types/budget";
import { dataInvalidation } from "../utils/dataInvalidation";
import { useBudgetStore } from "../store/budgetStore";

const STALE_TIME_MS = 60_000;

export function useCurrentBudget() {
  const budgetStatus = useBudgetStore((state) => state.currentBudgetStatus);
  const setCurrentBudgetStatus = useBudgetStore((state) => state.setCurrentBudgetStatus);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastFetchedAt = useRef<number | null>(null);

  const fetchBudget = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh && lastFetchedAt.current && Date.now() - lastFetchedAt.current < STALE_TIME_MS) {
      console.log(`[API SKIP] budget is fresh`);
      return;
    }

    const reason = isManualRefresh ? "manual_refresh" : (lastFetchedAt.current ? "stale_refetch" : "initial_load");
    console.log(`[API REQUEST] Fetching budget reason=${reason}`);

    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const result = await getCurrentBudgetStatus();
      setCurrentBudgetStatus(result);
      lastFetchedAt.current = Date.now();
      setError(null);
    } catch (e: any) {
      setCurrentBudgetStatus(null);
      setError(e as Error);
    } finally {
      if (isManualRefresh) setIsRefreshing(false);
      else setLoading(false);
    }
  }, [setCurrentBudgetStatus]);

  useEffect(() => {
    void fetchBudget();

    const unsubscribe = dataInvalidation.subscribe((key) => {
      if (key === "budget" || key === "transactions") {
        lastFetchedAt.current = null;
        void fetchBudget();
      }
    });

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        if (lastFetchedAt.current && Date.now() - lastFetchedAt.current > STALE_TIME_MS) {
          void fetchBudget();
        }
      }
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [fetchBudget]);

  return {
    budgetStatus,
    loading,
    error,
    isRefreshing,
    refetch: () => fetchBudget(true),
  };
}
