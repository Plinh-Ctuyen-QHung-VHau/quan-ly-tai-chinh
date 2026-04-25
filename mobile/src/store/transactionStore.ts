import { create } from "zustand";

import { OcrResult } from "../types/ocr";
import { Transaction } from "../types/transaction";

interface TransactionState {
  draftReceiptPath: string | null;
  draftOcrResult: OcrResult | null;
  selectedTransaction: Transaction | null;
  setDraftReceiptPath: (path: string | null) => void;
  setDraftOcrResult: (result: OcrResult | null) => void;
  setSelectedTransaction: (transaction: Transaction | null) => void;
  clearDraft: () => void;
}

export const useTransactionStore = create<TransactionState>()((set) => ({
  draftReceiptPath: null,
  draftOcrResult: null,
  selectedTransaction: null,
  setDraftReceiptPath: (draftReceiptPath: string | null) =>
    set({ draftReceiptPath }),
  setDraftOcrResult: (draftOcrResult) => set({ draftOcrResult }),
  setSelectedTransaction: (selectedTransaction) => set({ selectedTransaction }),
  clearDraft: () => set({ draftReceiptPath: null, draftOcrResult: null }),
}));
