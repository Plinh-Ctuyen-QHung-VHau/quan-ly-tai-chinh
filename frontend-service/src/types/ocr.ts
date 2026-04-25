import { TransactionType } from "./category";

export interface OcrResult {
  suggestedAmount?: number | null;
  suggestedDate?: string | null;
  suggestedType?: TransactionType | null;
  suggestedCategoryId?: string | null;
  merchantName?: string | null;
  imageUrl?: string | null;
  rawText?: string | null;
  confidence?: number | null;
}

export interface OcrScanRequest {
  sourceType: "camera" | "gallery";
  imageUrl: string;
}
