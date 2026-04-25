import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { PG_CONNECTION } from "../../database/database.module";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
import { AppError } from "../../../shared/errors/AppError";
import { ERROR_CODES } from "../../../shared/errors/errorCodes";

@Injectable()
export class UsersRepository {
  constructor(@Inject(PG_CONNECTION) private readonly pool: Pool) {}

  async findProfileById(userId: string) {
    const result = await this.pool.query(
      "SELECT id, full_name, avatar_url, created_at, updated_at FROM identity.profiles WHERE id = $1",
      [userId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { fullName, avatarUrl } = dto;
    const result = await this.pool.query(
      `UPDATE identity.profiles SET 
        full_name = COALESCE($1, full_name), 
        avatar_url = COALESCE($2, avatar_url),
        updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [fullName, avatarUrl, userId],
    );
    return result.rows[0];
  }

  async findSettingsByUserId(userId: string) {
    const result = await this.pool.query(
      "SELECT id, user_id, timezone, language, theme, created_at, updated_at FROM identity.user_settings WHERE user_id = $1",
      [userId],
    );
    if (result.rows.length === 0) {
      // Create default settings if not exist
      return this.createDefaultSettings(userId);
    }
    return result.rows[0];
  }

  async updateSettings(userId: string, dto: UpdateUserSettingsDto) {
    const { timezone, language, theme } = dto;
    const result = await this.pool.query(
      `UPDATE identity.user_settings SET 
        timezone = COALESCE($1, timezone), 
        language = COALESCE($2, language),
        theme = COALESCE($3, theme),
        updated_at = NOW()
       WHERE user_id = $4 RETURNING *`,
      [timezone, language, theme, userId],
    );
    if (result.rows.length === 0) {
      throw new AppError("Settings not found for user", ERROR_CODES.NOT_FOUND);
    }
    return result.rows[0];
  }

  private async createDefaultSettings(userId: string) {
    const result = await this.pool.query(
      `INSERT INTO identity.user_settings (user_id, timezone, language, theme)
           VALUES ($1, 'UTC', 'vi', 'light')
           RETURNING *`,
      [userId],
    );
    return result.rows[0];
  }
}
