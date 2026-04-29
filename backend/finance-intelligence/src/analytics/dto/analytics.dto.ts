import { IsDateString, IsOptional } from "class-validator";

export class AnalyticsSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
