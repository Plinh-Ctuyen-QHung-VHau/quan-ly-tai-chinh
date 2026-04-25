import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";
import { AppError } from "@shared/errors/AppError";
import { ERROR_CODES } from "@shared/errors/errorCodes";

const SCHEMA = process.env.SUPABASE_DB_SCHEMA || "identity";

@Injectable()
export class UsersRepository {
  constructor(private readonly supabaseService: SupabaseService) { }

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async findProfileById(userId: string) {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, full_name, avatar_url, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
    return data;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updatePayload: Record<string, any> = {};
    if (dto.fullName !== undefined) updatePayload.full_name = dto.fullName;
    if (dto.avatarUrl !== undefined) updatePayload.avatar_url = dto.avatarUrl;

    const { data, error } = await this.supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
    return data;
  }

  async findSettingsByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from("user_settings")
      .select("id, user_id, timezone, language, theme, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
    if (!data) {
      return this.createDefaultSettings(userId);
    }
    return data;
  }

  async updateSettings(userId: string, dto: UpdateUserSettingsDto) {
    const updatePayload: Record<string, any> = {};
    if (dto.timezone !== undefined) updatePayload.timezone = dto.timezone;
    if (dto.language !== undefined) updatePayload.language = dto.language;
    if (dto.theme !== undefined) updatePayload.theme = dto.theme;

    const { data, error } = await this.supabase
      .from("user_settings")
      .update(updatePayload)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new AppError(
        "Settings not found for user",
        ERROR_CODES.NOT_FOUND,
      );
    }
    return data;
  }

  private async createDefaultSettings(userId: string) {
    const { data, error } = await this.supabase
      .from("user_settings")
      .insert({
        user_id: userId,
        timezone: "UTC",
        language: "vi",
        theme: "light",
      })
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
    return data;
  }
}
