import { Pool } from "pg";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
export declare class UsersRepository {
  private readonly pool;
  constructor(pool: Pool);
  findProfileById(user_id: string): Promise<any>;
  updateProfile(user_id: string, dto: UpdateProfileDto): Promise<any>;
  findSettingsByuser_id(user_id: string): Promise<any>;
  updateSettings(user_id: string, dto: UpdateUserSettingsDto): Promise<any>;
  private createDefaultSettings;
}
