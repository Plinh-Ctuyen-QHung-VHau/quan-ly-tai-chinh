import { IsBoolean, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class FindNotificationsDto extends PaginationDto {
  @IsOptional()
  @IsBoolean()
  is_read?: boolean;
}
