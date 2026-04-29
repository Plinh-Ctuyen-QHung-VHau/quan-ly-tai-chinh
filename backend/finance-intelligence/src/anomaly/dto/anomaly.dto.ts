import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateAnomalyResultDto {
  @IsUUID()
  transaction_id: string;

  @IsUUID()
  user_id: string;

  @IsIn(["amount", "daily_spike", "frequency"])
  anomaly_type: "amount" | "daily_spike" | "frequency";

  @IsNumber()
  anomaly_score: number;

  @IsIn(["low", "medium", "high"])
  severity: "low" | "medium" | "high";

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  threshold_value?: number;

  @IsOptional()
  @IsNumber()
  actual_value?: number;
}
