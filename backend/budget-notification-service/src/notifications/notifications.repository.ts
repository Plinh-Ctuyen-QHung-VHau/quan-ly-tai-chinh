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
  created_at: Date;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  enable_all: boolean;
  enable_budget_alert: boolean;
  enable_anomaly_alert: boolean;
  enable_daily_reminder: boolean;
  reminder_time: string; // time
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async create(
    notification: Omit<Notification, "id" | "is_read" | "created_at">,
  ): Promise<Notification> {
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
        related_entity_id,
        related_entity_type,
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
      isRead,
    } = findDto;
    const offset = (page - 1) * limit;

    // Count query
    let countQuery = this.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    if (isRead !== undefined) {
      countQuery = countQuery.eq("is_read", isRead);
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

    if (isRead !== undefined) {
      dataQuery = dataQuery.eq("is_read", isRead);
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
      .update({ is_read: true, updated_at: new Date() })
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
      .update({ is_read: true, updated_at: new Date() }, { count: "exact" })
      .eq("user_id", user_id)
      .eq("is_read", false);

    if (error) throw new Error(error.message);
    return count || 0;
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
    const {
      enable_all,
      enable_budget_alert,
      enable_anomaly_alert,
      enable_daily_reminder,
      reminderTime,
    } = settings;

    const { data, error } = await this.supabase
      .from("notification_settings")
      .upsert(
        {
          user_id: user_id,
          enable_all: enable_all,
          enable_budget_alert: enable_budget_alert,
          enable_anomaly_alert: enable_anomaly_alert,
          enable_daily_reminder: enable_daily_reminder,
          reminder_time: reminderTime,
          updated_at: new Date(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToSettings(data);
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
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
