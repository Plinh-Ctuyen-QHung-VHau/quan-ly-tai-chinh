import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { AnomalyModule } from "../anomaly/anomaly.module";
import { SharedEventsModule } from "@shared/events/events.module";

@Module({
  imports: [AnomalyModule, SharedEventsModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
