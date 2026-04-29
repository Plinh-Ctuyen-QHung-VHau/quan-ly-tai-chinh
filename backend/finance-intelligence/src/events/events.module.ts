import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { EventsRepository } from "./events.repository";
import { EventPublisher } from "./event.publisher";
import { AnomalyModule } from "../anomaly/anomaly.module";

@Module({
  imports: [AnomalyModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository, EventPublisher],
  exports: [EventPublisher],
})
export class EventsModule {}
