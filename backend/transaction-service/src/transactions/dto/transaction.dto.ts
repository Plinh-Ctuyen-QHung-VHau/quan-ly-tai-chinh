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
  OCR = "ocr",
}

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsUUID()
  @Expose({ name: "category_id" })
  categoryId: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsDateString()
  @Expose({ name: "transaction_date" })
  transactionDate: string;

  @IsEnum(TransactionSource)
  source: TransactionSource;

  @IsOptional()
  @IsUrl()
  @Expose({ name: "image_url" })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @Expose({ name: "merchant_name" })
  merchantName?: string;

  @IsOptional()
  @IsUUID()
  @Expose({ name: "ocr_result_id" })
  ocrResultId?: string;

  @IsOptional()
  @IsBoolean()
  @Expose({ name: "is_anomaly" })
  isAnomaly?: boolean;

  @IsOptional()
  @IsNumber()
  @Expose({ name: "anomaly_score" })
  anomalyScore?: number;
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
  @Expose({ name: "category_id" })
  categoryId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  @Expose({ name: "transaction_date" })
  transactionDate?: string;

  @IsOptional()
  @IsString()
  @Expose({ name: "merchant_name" })
  merchantName?: string;

  @IsOptional()
  @IsBoolean()
  @Expose({ name: "is_anomaly" })
  isAnomaly?: boolean;

  @IsOptional()
  @IsNumber()
  @Expose({ name: "anomaly_score" })
  anomalyScore?: number;
}
