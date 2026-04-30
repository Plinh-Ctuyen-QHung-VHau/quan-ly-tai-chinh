import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getTransactionSummary } from "../services/transactionApi";
import { TransactionSummary } from "../types/transaction";
import { dataInvalidation } from "../utils/dataInvalidation";

const STALE_TIME_MS = 60_000;
const EMPTY_SUMMARY: TransactionSummary = {
  total_income: 0,
  total_expense: 0,
  balance: 0,
};

export function useTransactionSummary() {
  const [data, setData] = useState<TransactionSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastFetchedAt = useRef<number | null>(null);

  const fetchSummary = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh && lastFetchedAt.current && Date.now() - lastFetchedAt.current < STALE_TIME_MS) {
      console.log(`[API SKIP] transactionSummary is fresh`);
      return;
    }

    const reason = isManualRefresh ? "manual_refresh" : (lastFetchedAt.current ? "stale_refetch" : "initial_load");
    console.log(`[API REQUEST] Fetching transactionSummary reason=${reason}`);

    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const result = await getTransactionSummary();
      setData(result ?? EMPTY_SUMMARY);
      lastFetchedAt.current = Date.now();
      setError(null);
    } catch (e: any) {
      if (e?.statusCode === 404) {
        setData(EMPTY_SUMMARY);
      } else {
        setError(e as Error);
      }
    } finally {
      if (isManualRefresh) setIsRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary();

    const unsubscribe = dataInvalidation.subscribe((key) => {
      if (key === "transactions" || key === "transactionSummary") {
        lastFetchedAt.current = null;
        void fetchSummary();
      }
    });

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        if (lastFetchedAt.current && Date.now() - lastFetchedAt.current > STALE_TIME_MS) {
          void fetchSummary();
        }
      }
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [fetchSummary]);

  return {
    summary: data,
    loading,
    error,
    isRefreshing,
    refetch: () => fetchSummary(true),
  };
}
