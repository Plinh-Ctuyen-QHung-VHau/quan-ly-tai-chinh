import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { OcrResult, OcrScanRequest } from "../types/ocr";
import { endpoints } from "./endpoints";

function parseJsonMaybe(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as Record<string, any>;
  return null;
}

function normalizeOcrResult(raw: any): OcrResult {
  const data = raw?.data ?? raw;
  const parsed = parseJsonMaybe(
    data.parsedFieldsJson ?? data.parsed_fields_json,
  );

  return {
    id: data.id,
    requestId: data.requestId ?? data.request_id,
    extractedText:
      data.extractedText ?? data.extracted_text ?? parsed?.rawText ?? null,
    suggestedAmount: data.suggestedAmount ?? data.suggested_amount ?? null,
    suggestedDate: data.suggestedDate ?? data.suggested_date ?? null,
    suggestedType: data.suggestedType ?? data.suggested_type ?? null,
    suggestedCategoryId:
      data.suggestedCategoryId ?? data.suggested_category_id ?? null,
    merchantName: data.merchantName ?? data.merchant_name ?? null,
    imageUrl: data.imageUrl ?? data.image_url ?? null,
    parsedFieldsJson: parsed,
  };
}

export async function scanReceipt(payload: OcrScanRequest) {
  const response = await apiClient.post(endpoints.ocr.scan, payload);
  // The handleApiResponse is likely just checking for success, we get the actual data
  const handled = handleApiResponse<OcrResult>(response);
  // Normalize the result before returning
  return normalizeOcrResult(handled);
}
