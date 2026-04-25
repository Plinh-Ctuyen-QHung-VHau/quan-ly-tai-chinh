import { Pool } from "pg";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
export declare class UsersRepository {
    private readonly pool;
    constructor(pool: Pool);
    findProfileById(userId: string): Promise<any>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<any>;
    findSettingsByUserId(userId: string): Promise<any>;
    updateSettings(userId: string, dto: UpdateUserSettingsDto): Promise<any>;
    private createDefaultSettings;
}
