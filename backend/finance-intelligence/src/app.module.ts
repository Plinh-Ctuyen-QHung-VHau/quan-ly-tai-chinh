import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { configModuleOptions } from "./config/configuration";
import { HealthController } from "./health/health.controller";
import { MetricsModule } from "./metrics/metrics.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { ClientsModule } from "./clients/clients.module";
import { EventsModule } from "./events/events.module";
import { NlpModule } from "./nlp/nlp.module";
import { ChatModule } from "./chat/chat.module";
import { AnomalyModule } from "./anomaly/anomaly.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { RequestLoggerMiddleware } from "@shared/logger/requestLogger";

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    SupabaseModule,
    MetricsModule,
    ClientsModule,
    EventsModule,
    NlpModule,
    ChatModule,
    AnomalyModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
