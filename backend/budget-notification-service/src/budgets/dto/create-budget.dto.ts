import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from "class-validator";

export class CreateBudgetDto {
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  budgetAmount: number;

  @IsIn(["weekly", "monthly"])
  @IsNotEmpty()
  budgetPeriod: "weekly" | "monthly";

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
