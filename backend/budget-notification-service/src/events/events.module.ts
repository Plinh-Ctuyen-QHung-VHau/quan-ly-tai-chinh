import { Module } from "@nestjs/common";
import { EventPublisher } from "./event.publisher";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [EventPublisher],
  exports: [EventPublisher],
})
export class EventsModule {}
