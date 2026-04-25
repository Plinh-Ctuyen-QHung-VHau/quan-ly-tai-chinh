import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_CONNECTION } from "../database/database.module";

@Injectable()
export class EventPublisher {
  constructor(@Inject(PG_CONNECTION) private readonly pool: Pool) {}

  async publish(eventType: string, payload: any) {
    try {
      await this.pool.query(
        `INSERT INTO app_common.event_logs (event_type, payload) VALUES ($1, $2)`,
        [eventType, payload],
      );
    } catch (error) {
      // In a real-world scenario, you might want to handle this more gracefully
      // (e.g., using a dead-letter queue or more robust logging)
      console.error("Failed to publish event:", error);
    }
  }
}
