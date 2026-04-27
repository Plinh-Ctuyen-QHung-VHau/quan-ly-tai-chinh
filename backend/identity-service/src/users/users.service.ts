import { Injectable, NotFoundException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
import { AppError } from "@shared/errors/AppError";
import { ERROR_CODES } from "@shared/errors/errorCodes";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(user_id: string) {
    const profile = await this.usersRepository.findProfileById(user_id);
    if (!profile) {
      throw new AppError("User profile not found", ERROR_CODES.NOT_FOUND);
    }
    return profile;
  }

  async updateProfile(user_id: string, dto: UpdateProfileDto) {
    return this.usersRepository.updateProfile(user_id, dto);
  }

  async getSettings(user_id: string) {
    const settings = await this.usersRepository.findSettingsByuser_id(user_id);
    if (!settings) {
      throw new AppError("User settings not found", ERROR_CODES.NOT_FOUND);
    }
    return settings;
  }

  async updateSettings(user_id: string, dto: UpdateUserSettingsDto) {
    return this.usersRepository.updateSettings(user_id, dto);
  }
}
