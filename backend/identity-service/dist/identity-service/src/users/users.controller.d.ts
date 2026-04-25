import { UsersService } from "./users.service";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(userId: string): Promise<any>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<any>;
    getSettings(userId: string): Promise<any>;
    updateSettings(userId: string, dto: UpdateUserSettingsDto): Promise<any>;
}
