import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

const PROCESSED_EVENTS_SCHEMA =
  process.env.PROCESSED_EVENTS_SCHEMA || "app_common";

@Injectable()
export class EventsRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient().schema(PROCESSED_EVENTS_SCHEMA);
  }

  async isProcessed(event_id: string, consumer: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("processed_events")
      .select("id")
      .eq("event_id", event_id)
      .eq("consumer", consumer)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  async markProcessed(event_id: string, event_type: string, consumer: string) {
    const { error } = await this.supabase.from("processed_events").insert({
      event_id,
      event_type,
      consumer,
    });

    if (error) throw new Error(error.message);
  }
}
