import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { MetricsModule } from "./metrics/metrics.module";
import { DatabaseModule } from "./database/database.module";
import configuration from "./config/configuration";
import { BudgetsModule } from "./budgets/budgets.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ClientsModule } from "./clients/clients.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    HealthModule,
    MetricsModule,
    DatabaseModule,
    BudgetsModule,
    NotificationsModule,
    ClientsModule,
    EventsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
