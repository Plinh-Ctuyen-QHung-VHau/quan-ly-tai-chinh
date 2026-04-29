import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { SupabaseService } from "../supabase/supabase.service";

const EVENT_LOG_SCHEMA = process.env.EVENT_LOG_SCHEMA || "app_common";

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async publish(eventType: string, payload: any, producer: string) {
    const event_id = randomUUID();
    const occurred_at = new Date().toISOString();

    try {
      const { error } = await this.supabaseService
        .getClient()
        .schema(EVENT_LOG_SCHEMA)
        .from("event_logs")
        .insert({
          event_id,
          event_type: eventType,
          producer,
          payload,
          occurred_at,
        });

      if (error) {
        this.logger.error("Failed to publish event:", error.message);
      }
    } catch (error) {
      this.logger.error("Failed to publish event:", error);
    }

    // TODO: Publish to message broker when infrastructure is available.
  }
}
