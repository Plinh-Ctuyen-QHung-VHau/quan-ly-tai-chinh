import { UsersService } from "./users.service";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
export declare class UsersController {
  private readonly usersService;
  constructor(usersService: UsersService);
  getProfile(user_id: string): Promise<any>;
  updateProfile(user_id: string, dto: UpdateProfileDto): Promise<any>;
  getSettings(user_id: string): Promise<any>;
  updateSettings(user_id: string, dto: UpdateUserSettingsDto): Promise<any>;
}
