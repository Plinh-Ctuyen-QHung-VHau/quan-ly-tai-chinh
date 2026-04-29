import { Injectable } from "@nestjs/common";
import { Counter, Histogram } from "prom-client";

const METRICS_PREFIX = "finance_intelligence_service";

@Injectable()
export class AppMetrics {
  public readonly chatRequestsTotal: Counter<string>;
  public readonly nlpRequestsTotal: Counter<string>;
  public readonly anomaliesDetectedTotal: Counter<string>;
  public readonly anomalyProcessingDuration: Histogram<string>;

  constructor() {
    this.chatRequestsTotal = new Counter({
      name: `${METRICS_PREFIX}_chat_requests_total`,
      help: "Total number of chat requests",
      labelNames: ["intent"],
    });
    this.nlpRequestsTotal = new Counter({
      name: `${METRICS_PREFIX}_nlp_requests_total`,
      help: "Total number of NLP intent requests",
      labelNames: ["status"],
    });
    this.anomaliesDetectedTotal = new Counter({
      name: `${METRICS_PREFIX}_anomalies_detected_total`,
      help: "Total number of anomalies detected",
      labelNames: ["type", "severity"],
    });
    this.anomalyProcessingDuration = new Histogram({
      name: `${METRICS_PREFIX}_anomaly_processing_duration_seconds`,
      help: "Duration of anomaly processing in seconds",
      labelNames: ["event"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    });
  }
}
