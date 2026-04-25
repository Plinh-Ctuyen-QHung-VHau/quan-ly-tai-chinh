import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { OcrResult, OcrScanRequest } from "../types/ocr";

export async function scanReceipt(payload: OcrScanRequest) {
  const response = await apiClient.post("/api/ocr/scan", payload);
  return handleApiResponse<OcrResult>(response);
}
