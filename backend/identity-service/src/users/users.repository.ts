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

  async findProfileById(user_id: string) {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, full_name, avatar_url, created_at, updated_at")
      .eq("id", user_id)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
    return data;
  }

  async updateProfile(user_id: string, dto: UpdateProfileDto) {
    const { data, error } = await this.supabase
      .from("profiles")
      .update({
        full_name: dto.full_name,
        avatar_url: dto.avatar_url,
      })
      .eq("id", user_id)
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
    return data;
  }

  async findSettingsByuser_id(user_id: string) {
    const { data, error } = await this.supabase
      .from("user_settings")
      .select("id, user_id, timezone, language, theme, created_at, updated_at")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
    if (!data) {
      return this.createDefaultSettings(user_id);
    }
    return data;
  }

  async updateSettings(user_id: string, dto: UpdateUserSettingsDto) {
    const { data, error } = await this.supabase
      .from("user_settings")
      .update({
        timezone: dto.timezone,
        language: dto.language,
        theme: dto.theme,
      })
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) {
      throw new AppError("Settings not found for user", ERROR_CODES.NOT_FOUND);
    }
    return data;
  }

  private async createDefaultSettings(user_id: string) {
    const { data, error } = await this.supabase
      .from("user_settings")
      .insert({
        user_id: user_id,
      })
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
    return data;
  }
}
