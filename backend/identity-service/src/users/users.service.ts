import { Injectable, NotFoundException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
import { AuthEventDto } from "./dto/auth-event.dto";
import { AppError } from "@shared/errors/AppError";
import { ERROR_CODES } from "@shared/errors/errorCodes";

import { EventPublisher } from "@shared/events/event.publisher";

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async logAuthEvent(user_id: string, dto: AuthEventDto) {
    const validActions = ["login", "logout", "password_reset"];
    if (!validActions.includes(dto.action)) {
      throw new AppError("Invalid auth action", ERROR_CODES.VALIDATION_ERROR);
    }
    
    let eventName = "";
    if (dto.action === "login") eventName = "user.logged_in";
    if (dto.action === "logout") eventName = "user.logged_out";
    if (dto.action === "password_reset") eventName = "user.password_reset";

    this.eventPublisher.publish(eventName, { user_id, timestamp: new Date().toISOString() }, "identity-service").catch(err => console.error(err));
    return { success: true, event: eventName };
  }

  async getProfile(user_id: string) {
    const profile = await this.usersRepository.findProfileById(user_id);
    if (!profile) {
      throw new AppError("User profile not found", ERROR_CODES.NOT_FOUND);
    }
    return profile;
  }

  async updateProfile(user_id: string, dto: UpdateProfileDto) {
    const profile = await this.usersRepository.updateProfile(user_id, dto);
    await this.eventPublisher.publish("user.profile.updated", {
      user_id,
      ...dto
    }, "identity-service");
    return profile;
  }

  async getSettings(user_id: string) {
    const settings = await this.usersRepository.findSettingsByuser_id(user_id);
    if (!settings) {
      throw new AppError("User settings not found", ERROR_CODES.NOT_FOUND);
    }
    return settings;
  }

  async updateSettings(user_id: string, dto: UpdateUserSettingsDto) {
    const settings = await this.usersRepository.updateSettings(user_id, dto);
    await this.eventPublisher.publish("user.settings.updated", {
      user_id,
      ...dto
    }, "identity-service");
    return settings;
  }
}
