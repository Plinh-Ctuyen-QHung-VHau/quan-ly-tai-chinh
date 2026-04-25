import { UsersRepository } from "./users.repository";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: UsersRepository);
    getProfile(userId: string): Promise<any>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<any>;
    getSettings(userId: string): Promise<any>;
    updateSettings(userId: string, dto: UpdateUserSettingsDto): Promise<any>;
}
