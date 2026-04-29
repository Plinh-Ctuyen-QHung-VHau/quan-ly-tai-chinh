import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class TransactionEventDataDto {
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class TransactionEventDto {
  @IsString()
  event_id: string;

  @IsString()
  @IsIn(["transaction.created", "transaction.updated"])
  event: string;

  @IsOptional()
  @IsNumber()
  version?: number;

  @ValidateNested()
  @Type(() => TransactionEventDataDto)
  data: TransactionEventDataDto;
}
