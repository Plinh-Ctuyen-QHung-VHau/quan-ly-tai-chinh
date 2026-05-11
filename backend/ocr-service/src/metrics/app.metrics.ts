import { Injectable } from "@nestjs/common";
import {
  Counter,
  Histogram,
  register,
  collectDefaultMetrics,
} from "prom-client";

@Injectable()
export class AppMetrics {
  public readonly ocrRequestsTotal: Counter;
  public readonly ocrSuccessTotal: Counter;
  public readonly ocrFailuresTotal: Counter;
  public readonly ocrTimeoutTotal: Counter;
  public readonly ocrEngineErrorsTotal: Counter;
  public readonly ocrProcessingDurationSeconds: Histogram;
  public readonly ocrPreprocessingDurationSeconds: Histogram;

  constructor() {

    if (register.getSingleMetric("ocr_requests_total")) {
      this.ocrRequestsTotal = register.getSingleMetric(
        "ocr_requests_total",
      ) as Counter;
      this.ocrSuccessTotal = register.getSingleMetric(
        "ocr_success_total",
      ) as Counter;
      this.ocrFailuresTotal = register.getSingleMetric(
        "ocr_failures_total",
      ) as Counter;
      this.ocrTimeoutTotal = register.getSingleMetric(
        "ocr_timeout_total",
      ) as Counter;
      this.ocrEngineErrorsTotal = register.getSingleMetric(
        "ocr_engine_errors_total",
      ) as Counter;
      this.ocrProcessingDurationSeconds = register.getSingleMetric(
        "ocr_processing_duration_seconds",
      ) as Histogram;
      this.ocrPreprocessingDurationSeconds = register.getSingleMetric(
        "ocr_preprocessing_duration_seconds",
      ) as Histogram;
    } else {
      this.ocrRequestsTotal = new Counter({
        name: "ocr_requests_total",
        help: "Total number of OCR requests.",
      });
      this.ocrSuccessTotal = new Counter({
        name: "ocr_success_total",
        help: "Total number of successful OCR requests.",
      });
      this.ocrFailuresTotal = new Counter({
        name: "ocr_failures_total",
        help: "Total number of failed OCR requests.",
      });
      this.ocrTimeoutTotal = new Counter({
        name: "ocr_timeout_total",
        help: "Total number of OCR requests that timed out.",
      });
      this.ocrEngineErrorsTotal = new Counter({
        name: "ocr_engine_errors_total",
        help: "Total number of errors from the OCR engine itself.",
      });
      this.ocrProcessingDurationSeconds = new Histogram({
        name: "ocr_processing_duration_seconds",
        help: "Duration of OCR processing in seconds.",
        buckets: [0.5, 1, 5, 10, 15, 30, 60],
      });
      this.ocrPreprocessingDurationSeconds = new Histogram({
        name: "ocr_preprocessing_duration_seconds",
        help: "Duration of image preprocessing in seconds.",
        buckets: [0.1, 0.2, 0.5, 1, 2, 5],
      });
      collectDefaultMetrics();
    }
  }
}
