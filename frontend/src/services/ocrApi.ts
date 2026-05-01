import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { OcrResult, OcrResultRaw, OcrScanRequest } from "../types/ocr";
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

function normalizeOcrResult(raw: OcrResultRaw): OcrResult {
  const parsed = parseJsonMaybe(raw.parsed_fields_json);

  return {
    id: raw.id,
    request_id: raw.request_id ?? raw.ocrrequest_id,
    extracted_text: raw.extracted_text ?? parsed?.rawText ?? null,
    suggested_amount:
      raw.suggested_amount != null ? Number(raw.suggested_amount) : null,
    suggested_date: raw.suggested_date ?? null,
    suggested_type: raw.suggested_type ?? null,
    suggestedcategory_id: raw.suggested_category_id ?? null,
    merchant_name: raw.merchant_name ?? null,
    image_url: raw.image_url ?? null,
    parsed_fields_json: parsed,
  };
}

export async function scanReceipt(payload: OcrScanRequest) {
  const response = await apiClient.post(endpoints.ocr.scan, payload);
  const handled = handleApiResponse<OcrResultRaw>(response);
  return normalizeOcrResult(handled);
}

