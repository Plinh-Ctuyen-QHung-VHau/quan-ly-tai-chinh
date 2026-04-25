import { register, Counter, Histogram } from "prom-client";

const ocrRequests = new Counter({
  name: "ocr_requests_total",
  help: "Total number of OCR requests initiated",
  labelNames: ["source"],
});

const ocrSuccess = new Counter({
  name: "ocr_success_total",
  help: "Total number of successful OCR processing events",
  labelNames: ["source"],
});

const ocrFailures = new Counter({
  name: "ocr_failures_total",
  help: "Total number of failed OCR processing events",
  labelNames: ["source"],
});

const ocrDuration = new Histogram({
  name: "ocr_processing_duration_seconds",
  help: "Duration of OCR processing in seconds",
  labelNames: ["status"],
  buckets: [0.5, 1, 1.5, 2, 3, 5, 10],
});

export const OCR_METRICS = {
  ocrRequests,
  ocrSuccess,
  ocrFailures,
  ocrDuration,
  register,
};
