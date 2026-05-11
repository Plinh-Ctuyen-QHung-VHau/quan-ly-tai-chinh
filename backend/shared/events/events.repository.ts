import { Injectable, Logger } from "@nestjs/common";
import { createSupabaseAdminClient } from "../supabase/supabase.client";

const PROCESSED_EVENTS_SCHEMA = process.env.PROCESSED_EVENTS_SCHEMA || "app_common";

@Injectable()
export class EventsRepository {
  private readonly logger = new Logger(EventsRepository.name);
  private supabaseClient = createSupabaseAdminClient();

  private get supabase() {
    return this.supabaseClient.schema(PROCESSED_EVENTS_SCHEMA);
  }

  async isProcessed(event_id: string, consumer: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("processed_events")
        .select("id")
        .eq("event_id", event_id)
        .eq("consumer", consumer)
        .maybeSingle();

      if (error) {
        this.logger.error(`[EventsRepository] Lỗi khi kiểm tra event isProcessed: ${error.message}`);
        return false;
      }
      return Boolean(data);
    } catch (err) {
      this.logger.error(`[EventsRepository] Ngoại lệ khi chạy isProcessed:`, err);
      return false;
    }
  }

  async markProcessed(event_id: string, event_type: string, consumer: string) {
    try {
      const { error } = await this.supabase.from("processed_events").insert({
        event_id,
        event_type,
        consumer,
      });

      if (error) {
         this.logger.error(`[EventsRepository] Lỗi khi đánh dấu markProcessed: ${error.message}`);
      }
    } catch (err) {
       this.logger.error(`[EventsRepository] Ngoại lệ khi chạy markProcessed:`, err);
    }
  }
}
