import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from "class-validator";
import { Expose } from "class-transformer";

export class CreateBudgetDto {
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  @Expose({ name: "budget_amount" })
  budget_amount: number;

  @IsIn(["weekly", "monthly"])
  @IsNotEmpty()
  @Expose({ name: "budget_period" })
  budgetPeriod: "weekly" | "monthly";

  @IsDateString()
  @IsNotEmpty()
  @Expose({ name: "start_date" })
  start_date: string;

  @IsDateString()
  @IsOptional()
  @Expose({ name: "end_date" })
  end_date?: string;
}
