import { Global, Module } from "@nestjs/common";
import { MetricsController } from "./metrics.controller";
import { AppMetrics } from "./app.metrics";
import { CommonMetrics } from "../shared/metrics/commonMetrics";

@Global()
@Module({
  controllers: [MetricsController],
  providers: [AppMetrics, CommonMetrics],
  exports: [AppMetrics, CommonMetrics],
})
export class MetricsModule {}
