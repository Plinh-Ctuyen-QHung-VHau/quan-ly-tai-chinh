import { TransactionType } from "./category";

/** Shape chuẩn hóa (camelCase) dùng trong toàn bộ FE sau khi normalize */
export interface OcrResult {
  id?: string;
  request_id?: string;
  extracted_text?: string | null;
  suggested_amount?: number | null;
  suggested_date?: string | null;
  suggested_type?: "income" | "expense" | null;
  suggestedcategory_id?: string | null;
  merchant_name?: string | null;
  image_url?: string | null;
  parsed_fields_json?: Record<string, any> | null;
}

/** Shape thô từ API (snake_case — Supabase trả nguyên bản) */
export interface OcrResultRaw {
  id?: string;
  request_id?: string;
  ocrrequest_id?: string;
  ocr_result_id?: string;
  extracted_text?: string | null;
  suggested_amount?: number | string | null;
  suggested_date?: string | null;
  suggested_type?: "income" | "expense" | null;
  suggested_category_id?: string | null;
  merchant_name?: string | null;
  image_url?: string | null;
  parsed_fields_json?: Record<string, any> | string | null;
}

export interface OcrScanRequest {
  source_type: "camera" | "gallery";
  image_url: string;
}
