import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health/health.controller";
import { MetricsModule } from "./metrics/metrics.module";
import { DatabaseModule } from "./database/database.module";
import { configModuleOptions } from "./config/configuration";
import { BudgetsModule } from "./budgets/budgets.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ClientsModule } from "./clients/clients.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    DatabaseModule,
    MetricsModule,
    BudgetsModule,
    NotificationsModule,
    ClientsModule,
    EventsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
