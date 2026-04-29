import { Module } from "@nestjs/common";
import { AnomalyService } from "./anomaly.service";
import { AnomalyRepository } from "./anomaly.repository";
import { ClientsModule } from "../clients/clients.module";

@Module({
  imports: [ClientsModule],
  providers: [AnomalyService, AnomalyRepository],
  exports: [AnomalyService],
})
export class AnomalyModule {}
