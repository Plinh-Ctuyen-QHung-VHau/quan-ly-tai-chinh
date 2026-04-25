import { IsEnum, IsOptional } from "class-validator";

export enum CategoryType {
  INCOME = "income",
  EXPENSE = "expense",
}

export class GetCategoriesQueryDto {
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;
}
