import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { OcrResult, OcrScanRequest } from "../types/ocr";
import { endpoints } from "./endpoints";

export async function scanReceipt(payload: OcrScanRequest) {
  const response = await apiClient.post(endpoints.ocr.scan, payload);
  return handleApiResponse<OcrResult>(response);
}
