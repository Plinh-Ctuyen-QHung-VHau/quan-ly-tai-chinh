import { Module } from "@nestjs/common";
import { AnomaliesController } from "./anomalies.controller";
import { AnomalyService } from "./anomaly.service";
import { AnomalyRepository } from "./anomaly.repository";
import { ClientsModule } from "../clients/clients.module";

@Module({
  imports: [ClientsModule],
  controllers: [AnomaliesController],
  providers: [AnomalyService, AnomalyRepository],
  exports: [AnomalyService],
})
export class AnomalyModule {}
