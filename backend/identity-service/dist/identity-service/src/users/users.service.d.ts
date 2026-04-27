import { UsersRepository } from "./users.repository";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
export declare class UsersService {
  private readonly usersRepository;
  constructor(usersRepository: UsersRepository);
  getProfile(user_id: string): Promise<any>;
  updateProfile(user_id: string, dto: UpdateProfileDto): Promise<any>;
  getSettings(user_id: string): Promise<any>;
  updateSettings(user_id: string, dto: UpdateUserSettingsDto): Promise<any>;
}
