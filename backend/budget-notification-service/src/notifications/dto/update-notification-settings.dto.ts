import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  enable_all?: boolean;

  @IsOptional()
  @IsBoolean()
  enable_budget_alert?: boolean;

  @IsOptional()
  @IsBoolean()
  enable_anomaly_alert?: boolean;

  @IsOptional()
  @IsBoolean()
  enable_daily_reminder?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: "reminder_time must be in HH:mm or HH:mm:ss format",
  })
  reminder_time?: string | null;

  @IsOptional()
  @IsString()
  push_token?: string | null;
}
