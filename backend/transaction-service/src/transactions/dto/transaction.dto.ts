import {
  IsString,
  IsNumber,
  IsDateString,
  IsUUID,
  IsOptional,
  IsEnum,
  Min,
  IsUrl,
} from 'class-validator';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum TransactionSource {
    CAMERA = 'camera',
    GALLERY = 'gallery',
    OCR = 'ocr',
}

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsDateString()
  transactionDate: string;

  @IsEnum(TransactionSource)
  source: TransactionSource;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  merchantName?: string;

  @IsOptional()
  @IsUUID()
  ocrResultId?: string;
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
  categoryId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;
  
  @IsOptional()
  @IsString()
  merchantName?: string;
}
