import { Module } from "@nestjs/common";
import { EventPublisher } from "./event.publisher";
import { EventsRepository } from "./events.repository";

@Module({
  providers: [EventPublisher, EventsRepository],
  exports: [EventPublisher, EventsRepository],
})
export class SharedEventsModule {}
