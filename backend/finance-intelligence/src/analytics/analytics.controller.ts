import { Controller, Get, Query, UsePipes, ValidationPipe } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsSummaryQueryDto } from "./dto/analytics.dto";
import { Getuser_id } from "../common/decorators/get-user-id.decorator";

@Controller("analytics")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("summary")
  getSummary(
    @Getuser_id() user_id: string,
    @Query() query: AnalyticsSummaryQueryDto,
  ) {
    return this.analyticsService.getSpendingSummary(
      user_id,
      query.fromDate,
      query.toDate,
    );
  }
}
