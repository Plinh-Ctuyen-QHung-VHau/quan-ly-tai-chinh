import { TransactionType } from "./category";

export interface OcrResult {
  id: string;
  extracted_text: string;
  confidence_score: number;
  bounding_box: any;
  status: "pending" | "completed" | "failed";
  error_message?: string | null;
  user_id: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  merchant_name?: string | null;
  transaction_date?: string | null;
  total_amount?: number | null;
  suggested_category_id?: string | null;
}

export interface OcrScanRequest {
  sourceType: "camera" | "gallery";
  imageUrl: string;
}
