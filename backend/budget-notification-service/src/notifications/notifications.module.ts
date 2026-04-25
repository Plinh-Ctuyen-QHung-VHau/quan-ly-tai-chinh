import { Module } from "@nestjs/common";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { DatabaseModule } from "../database/database.module";
import { MetricsModule } from "../metrics/metrics.module";

@Module({
  imports: [DatabaseModule, MetricsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
