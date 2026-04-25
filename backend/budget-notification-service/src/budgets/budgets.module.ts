import { Module } from "@nestjs/common";
import { BudgetsRepository } from "./budgets.repository";
import { BudgetsService } from "./budgets.service";
import { BudgetsController } from "./budgets.controller";
import { DatabaseModule } from "../database/database.module";
import { ClientsModule } from "../clients/clients.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { EventsModule } from "../events/events.module";
import { MetricsModule } from "../metrics/metrics.module";

@Module({
  imports: [
    DatabaseModule,
    ClientsModule,
    NotificationsModule,
    EventsModule,
    MetricsModule,
  ],
  controllers: [BudgetsController],
  providers: [BudgetsService, BudgetsRepository],
})
export class BudgetsModule {}
