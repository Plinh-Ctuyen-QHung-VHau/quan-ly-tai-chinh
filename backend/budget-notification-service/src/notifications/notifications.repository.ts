import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { FindNotificationsDto } from "./dto/find-notifications.dto";
import { UpdateNotificationSettingsDto } from "./dto/update-notification-settings.dto";

const SCHEMA = process.env.SUPABASE_DB_SCHEMA || "budget";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: "reminder" | "budget_alert" | "anomaly_alert" | "financial_tip";
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export type CreateNotificationInput = {
  user_id: string;
  title: string;
  content: string;
  type: "reminder" | "budget_alert" | "anomaly_alert" | "financial_tip";
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  push_token?: string | null;
};

export interface NotificationSettings {
  id: string;
  user_id: string;
  enable_all: boolean;
  enable_budget_alert: boolean;
  enable_anomaly_alert: boolean;
  enable_daily_reminder: boolean;
  reminder_time: string; // time
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly supabaseService: SupabaseService) { }

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async create(notification: CreateNotificationInput): Promise<Notification> {
    const {
      user_id,
      type,
      title,
      content,
      related_entity_id,
      related_entity_type,
    } = notification;
    const { data, error } = await this.supabase
      .from("notifications")
      .insert({
        user_id,
        type,
        title,
        content,
        related_entity_id: related_entity_id ?? null,
        related_entity_type: related_entity_type ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToNotification(data);
  }

  async find(
    user_id: string,
    findDto: FindNotificationsDto,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "DESC",
      is_read,
      type,
    } = findDto;
    const offset = (page - 1) * limit;

    // Count query
    let countQuery = this.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    if (is_read !== undefined) {
      countQuery = countQuery.eq("is_read", is_read);
    }
    if (type) {
      countQuery = countQuery.eq("type", type);
    }

    const { count: total, error: countError } = await countQuery;
    if (countError) throw new Error(countError.message);

    // Data query
    let dataQuery = this.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user_id)
      .order(sortBy, { ascending: sortOrder === "ASC" })
      .range(offset, offset + limit - 1);

    if (is_read !== undefined) {
      dataQuery = dataQuery.eq("is_read", is_read);
    }
    if (type) {
      dataQuery = dataQuery.eq("type", type);
    }

    const { data, error: dataError } = await dataQuery;
    if (dataError) throw new Error(dataError.message);

    return {
      notifications: (data || []).map(this.mapToNotification),
      total: total || 0,
    };
  }

  async findById(id: string, user_id: string): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .from("notifications")
      .select("*")
      .eq("id", id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? this.mapToNotification(data) : null;
  }

  async markAsRead(id: string, user_id: string): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data ? this.mapToNotification(data) : null;
  }

  async markAllAsRead(user_id: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("notifications")
      .update({ is_read: true }, { count: "exact" })
      .eq("user_id", user_id)
      .eq("is_read", false);

    if (error) throw new Error(error.message);
    return count || 0;
  }

  async hasReminderToday(user_id: string): Promise<boolean> {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const { count, error } = await this.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("type", "reminder")
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`);

    if (error) throw new Error(error.message);
    return (count || 0) > 0;
  }

  async getSettings(user_id: string): Promise<NotificationSettings | null> {
    const { data, error } = await this.supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? this.mapToSettings(data) : null;
  }

  async updateSettings(
    user_id: string,
    settings: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    // Only include defined fields to avoid overwriting existing values
    const payload: Record<string, any> = { user_id };
    if (settings.enable_all !== undefined) payload.enable_all = settings.enable_all;
    if (settings.enable_budget_alert !== undefined) payload.enable_budget_alert = settings.enable_budget_alert;
    if (settings.enable_anomaly_alert !== undefined) payload.enable_anomaly_alert = settings.enable_anomaly_alert;
    if (settings.enable_daily_reminder !== undefined) payload.enable_daily_reminder = settings.enable_daily_reminder;
    if (settings.reminder_time !== undefined) payload.reminder_time = settings.reminder_time;
    if (settings.push_token !== undefined) payload.push_token = settings.push_token;

    const { data, error } = await this.supabase
      .from("notification_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToSettings(data);
  }

  async getUsersWithDailyReminderEnabled(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("notification_settings")
      .select("user_id")
      .eq("enable_all", true)
      .eq("enable_daily_reminder", true);

    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => row.user_id);
  }

  private mapToNotification(row: any): Notification {
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      content: row.content,
      related_entity_type: row.related_entity_type,
      related_entity_id: row.related_entity_id,
      is_read: row.is_read,
      created_at: row.created_at,
    };
  }

  private mapToSettings(row: any): NotificationSettings {
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      enable_all: row.enable_all,
      enable_budget_alert: row.enable_budget_alert,
      enable_anomaly_alert: row.enable_anomaly_alert,
      enable_daily_reminder: row.enable_daily_reminder,
      reminder_time: row.reminder_time,
      push_token: row.push_token,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
