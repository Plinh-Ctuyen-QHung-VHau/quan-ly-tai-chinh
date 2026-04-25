import { IsBoolean, IsNotEmpty } from "class-validator";

export class UpdateNotificationSettingsDto {
  @IsBoolean()
  @IsNotEmpty()
  enableAll: boolean;

  @IsBoolean()
  @IsNotEmpty()
  enableBudgetAlert: boolean;

  @IsBoolean()
  @IsNotEmpty()
  enableDailyReminder: boolean;
}
