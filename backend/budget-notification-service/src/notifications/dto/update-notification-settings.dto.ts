import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";
import { Expose } from "class-transformer";

export class UpdateNotificationSettingsDto {
  @IsBoolean()
  @IsNotEmpty()
  @Expose({ name: "enable_all" })
  enable_all: boolean;

  @IsBoolean()
  @IsNotEmpty()
  @Expose({ name: "enable_budget_alert" })
  enable_budget_alert: boolean;

  @IsBoolean()
  @IsNotEmpty()
  @Expose({ name: "enable_anomaly_alert" })
  enable_anomaly_alert: boolean;

  @IsBoolean()
  @IsNotEmpty()
  @Expose({ name: "enable_daily_reminder" })
  enable_daily_reminder: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: "reminder_time must be in HH:mm or HH:mm:ss format",
  })
  reminder_time?: string;
}
