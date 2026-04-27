import { IsString, IsOptional, IsUrl, IsIn, IsNotEmpty } from "class-validator";
import { Expose } from "class-transformer";

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Expose({ name: "full_name" })
  fullName?: string;

  @IsUrl()
  @IsOptional()
  @Expose({ name: "avatar_url" })
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  @Expose({ name: "username" })
  username?: string;

  @IsString()
  @IsOptional()
  @Expose({ name: "website" })
  website?: string;
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

  @IsString()
  @IsOptional()
  currency?: string;
}
