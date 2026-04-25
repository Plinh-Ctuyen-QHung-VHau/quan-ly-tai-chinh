import { Injectable, NotFoundException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
import { AppError } from "../../../shared/errors/AppError";
import { ERROR_CODES } from "../../../shared/errors/errorCodes";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string) {
    const profile = await this.usersRepository.findProfileById(userId);
    if (!profile) {
      throw new AppError("User profile not found", ERROR_CODES.NOT_FOUND);
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.usersRepository.updateProfile(userId, dto);
  }

  async getSettings(userId: string) {
    const settings = await this.usersRepository.findSettingsByUserId(userId);
    if (!settings) {
      throw new AppError("User settings not found", ERROR_CODES.NOT_FOUND);
    }
    return settings;
  }

  async updateSettings(userId: string, dto: UpdateUserSettingsDto) {
    return this.usersRepository.updateSettings(userId, dto);
  }
}
