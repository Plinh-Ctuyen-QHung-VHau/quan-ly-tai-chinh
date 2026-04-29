import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { EventsRepository } from "./events.repository";
import { AnomalyService } from "../anomaly/anomaly.service";
import { TransactionEventDto } from "./dto/transaction-event.dto";
import { configuration } from "../config/configuration";
import { AppMetrics } from "../metrics/app.metrics";
import { EventPublisher } from "./event.publisher";

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly anomalyService: AnomalyService,
    private readonly eventPublisher: EventPublisher,
    private readonly metrics: AppMetrics,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  async handleTransactionEvent(dto: TransactionEventDto) {
    const { event_id, event, data } = dto;
    const consumer = this.appConfig.consumerName;

    if (await this.eventsRepository.isProcessed(event_id, consumer)) {
      return { status: "duplicate", event_id };
    }

    if (!data?.user_id || !data?.transaction_id || !data?.timestamp) {
      this.logger.warn(
        `Missing required data for event ${event_id}; skipping anomaly detection`,
      );
      await this.eventsRepository.markProcessed(event_id, event, consumer);
      return { status: "skipped", reason: "missing_fields" };
    }

    const endTimer = this.metrics.anomalyProcessingDuration.startTimer();
    try {
      const anomalies = await this.anomalyService.processTransactionEvent(event, data);
      for (const anomaly of anomalies) {
        await this.eventPublisher.publish(
          "anomaly.detected",
          {
            anomaly_id: anomaly.id,
            transaction_id: anomaly.transaction_id,
            user_id: anomaly.user_id,
            anomaly_type: anomaly.anomaly_type,
            anomaly_score: anomaly.anomaly_score,
            severity: anomaly.severity,
            reason: anomaly.reason,
            threshold_value: anomaly.threshold_value,
            actual_value: anomaly.actual_value,
          },
          this.appConfig.consumerName,
        );
      }
      await this.eventsRepository.markProcessed(event_id, event, consumer);
      endTimer({ event });

      return {
        status: anomalies.length ? "processed" : "no_anomaly",
        anomalies,
      };
    } catch (error) {
      endTimer({ event });
      this.logger.error("Failed to process transaction event", error as Error);
      throw error;
    }
  }
}
