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

let refreshTimeout: NodeJS.Timeout | null = null;

export function invalidateData(key: DataKey) {
  dataInvalidation.invalidate(key);
  
  const refreshKeys: DataKey[] = ["transactions", "transactionSummary", "budget", "categories", "notifications", "ocrResult"];
  
  if (refreshKeys.includes(key)) {
    // Sử dụng debounce để tránh gọi refresh quá nhiều lần liên tục (ví dụ xóa hàng loạt)
    if (refreshTimeout) clearTimeout(refreshTimeout);
    
    refreshTimeout = setTimeout(() => {
      console.log(`[INVALIDATION] Triggering global store refresh after delay for key: ${key}`);
      void useAppDataStore.getState().refresh();
    }, 500); // 500ms để Backend kịp commit dữ liệu
  }
}
