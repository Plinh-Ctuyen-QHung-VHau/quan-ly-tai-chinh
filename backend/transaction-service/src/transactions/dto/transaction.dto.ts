import {
  IsString,
  IsNumber,
  IsDateString,
  IsUUID,
  IsOptional,
  IsEnum,
  Min,
  IsUrl,
  IsBoolean,
} from "class-validator";
import { Expose } from "class-transformer";

export enum TransactionType {
  INCOME = "income",
  EXPENSE = "expense",
}

export enum TransactionSource {
  CAMERA = "camera",
  GALLERY = "gallery",
  CHATBOT = "chatbot",
}

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsUUID()
  category_id: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsDateString()
  transaction_date: string;

  @IsEnum(TransactionSource)
  source: TransactionSource;

  @IsOptional()
  @IsUrl()
  image_url?: string;

  @IsOptional()
  @IsString()
  merchant_name?: string;

  @IsOptional()
  @IsUUID()
  ocr_result_id?: string;

  @IsOptional()
  @IsBoolean()
  isAnomaly?: boolean;

  @IsOptional()
  @IsNumber()
  anomaly_score?: number;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  transaction_date?: string;

  @IsOptional()
  @IsString()
  merchant_name?: string;

  @IsOptional()
  @IsBoolean()
  isAnomaly?: boolean;

  @IsOptional()
  @IsNumber()
  anomaly_score?: number;
}
