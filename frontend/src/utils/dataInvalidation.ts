export type DataKey =
  | "transactions"
  | "transactionSummary"
  | "budget"
  | "notifications"
  | "categories"
  | "ocrResult";

type Listener = (key: DataKey) => void;

class InvalidationEmitter {
  private listeners: Set<Listener> = new Set();
  
  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  invalidate(key: DataKey) {
    console.log(`[INVALIDATION] Invalidating data for key: ${key}`);
    this.listeners.forEach((l) => l(key));
  }
}

import { useAppDataStore } from "../store/appDataStore";

export const dataInvalidation = new InvalidationEmitter();

export function invalidateData(key: DataKey) {
  dataInvalidation.invalidate(key);
  if (key === "transactions" || key === "transactionSummary" || key === "budget" || key === "categories") {
    void useAppDataStore.getState().refresh();
  }
}
