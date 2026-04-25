import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { DATABASE_POOL } from "../database/database.constants";

@Injectable()
export class EventPublisher {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

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
