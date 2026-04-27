import { TransactionType } from "./category";

export interface OcrResult {
  id?: string;
  requestId?: string;
  request_id?: string;
  extractedText?: string | null;
  extracted_text?: string | null;
  suggestedAmount?: number | string | null;
  suggested_amount?: number | string | null;
  suggestedDate?: string | Date | null;
  suggested_date?: string | Date | null;
  suggestedType?: "income" | "expense" | null;
  suggested_type?: "income" | "expense" | null;
  suggestedCategoryId?: string | null;
  suggested_category_id?: string | null;
  merchantName?: string | null;
  merchant_name?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  parsedFieldsJson?: Record<string, any> | string | null;
  parsed_fields_json?: Record<string, any> | string | null;
}

export interface OcrScanRequest {
  sourceType: "camera" | "gallery";
  imageUrl: string;
}
