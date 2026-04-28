import { IsString, IsOptional, IsUrl, IsIn, IsNotEmpty } from "class-validator";

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  full_name?: string;

  @IsUrl()
  @IsOptional()
  avatar_url?: string;

  // NOTE: username, website do NOT exist in identity.profiles schema — removed
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

  // NOTE: currency does NOT exist in identity.user_settings schema — removed
}
