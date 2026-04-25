import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { MetricsController } from "./metrics/metrics.controller";

@Module({
  imports: [],
  controllers: [HealthController, MetricsController],
  providers: [],
})
export class AppModule {}
