import { IsString, IsOptional, IsUrl, IsIn, IsNotEmpty } from "class-validator";

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  fullName?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}

export class UpdateUserSettingsDto {
  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsIn(["light", "dark"])
  @IsOptional()
  theme?: "light" | "dark";
}
