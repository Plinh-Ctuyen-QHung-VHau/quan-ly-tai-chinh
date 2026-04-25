import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { HealthController } from "./health/health.controller";
import { MetricsController } from "./metrics/metrics.controller";

@Module({
  imports: [],
  controllers: [AppController, HealthController, MetricsController],
  providers: [],
})
export class AppModule {}
