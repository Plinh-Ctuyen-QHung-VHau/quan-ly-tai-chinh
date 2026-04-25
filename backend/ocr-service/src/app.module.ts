import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health/health.controller";
import { MetricsController } from "./metrics/metrics.controller";
import { configModuleOptions } from "./config/configuration";
import { DatabaseModule } from "./database/database.module";
import { OcrModule } from "./ocr/ocr.module";

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    DatabaseModule,
    OcrModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [],
})
export class AppModule {}
