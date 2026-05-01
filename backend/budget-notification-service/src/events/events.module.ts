import { Module } from "@nestjs/common";
import { SharedEventsModule } from "@shared/events/events.module";

@Module({
  imports: [SharedEventsModule],
  exports: [SharedEventsModule],
})
export class EventsModule {}
