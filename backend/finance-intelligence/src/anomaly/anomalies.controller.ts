import { Controller, Get, Param, Post, UsePipes, ValidationPipe } from "@nestjs/common";
import { AnomalyService } from "./anomaly.service";
import { Getuser_id } from "../common/decorators/get-user-id.decorator";

@Controller("anomalies")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AnomaliesController {
  constructor(private readonly anomalyService: AnomalyService) {}

  @Get()
  getAnomalies(@Getuser_id() user_id: string) {
    return this.anomalyService.getRecentAnomalies(user_id, 50);
  }

  @Get(":transactionId")
  getAnomalyDetail(@Param("transactionId") transactionId: string) {
    return this.anomalyService.findByTransaction(transactionId);
  }

  @Post("recheck/:transactionId")
  recheck(@Param("transactionId") transactionId: string) {
    return this.anomalyService.recheckTransaction(transactionId);
  }
}
