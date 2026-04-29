import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { Transform, Type } from "class-transformer";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class FindNotificationsDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  is_read?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(["reminder", "budget_alert", "anomaly_alert", "financial_tip"])
  type?: string;

  // Override default sortBy from PaginationDto (transaction_date → created_at)
  sortBy: string = "created_at";
}
