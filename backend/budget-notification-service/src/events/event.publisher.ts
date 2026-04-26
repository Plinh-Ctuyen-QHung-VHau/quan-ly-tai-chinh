import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

const EVENT_LOG_SCHEMA = process.env.EVENT_LOG_SCHEMA || "app_common";

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(private readonly supabaseService: SupabaseService) { }

  async publish(eventType: string, payload: any) {
    try {
      const { error } = await this.supabaseService
        .getClient()
        .schema(EVENT_LOG_SCHEMA)
        .from("event_logs")
        .insert({
          event_type: eventType,
          payload,
        });

      if (error) {
        this.logger.error("Failed to publish event:", error.message);
      }
    } catch (error) {
      this.logger.error("Failed to publish event:", error);
    }
  }
}
