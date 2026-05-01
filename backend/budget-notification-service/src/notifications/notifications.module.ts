import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { MetricsModule } from "../metrics/metrics.module";

import { SharedEventsModule } from "@shared/events/events.module";

@Module({
  imports: [MetricsModule, HttpModule, SharedEventsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule { }
