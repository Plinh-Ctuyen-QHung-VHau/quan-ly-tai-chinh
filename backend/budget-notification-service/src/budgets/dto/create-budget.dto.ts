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
  budget_amount: number;

  @IsIn(["weekly", "monthly"])
  @IsNotEmpty()
  budget_period: "weekly" | "monthly";

  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @IsDateString()
  @IsNotEmpty()
  end_date: string; // NOT NULL in DB
}
