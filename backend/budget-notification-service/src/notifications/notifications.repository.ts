import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { FindNotificationsDto } from "./dto/find-notifications.dto";

const SCHEMA = process.env.SUPABASE_DB_SCHEMA || "budget";

export interface Notification {
  id: string;
  userId: string;
  type: "budget_alert" | "daily_reminder" | "system_update";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationSettings {
  userId: string;
  enableAll: boolean;
  enableBudgetAlert: boolean;
  enableDailyReminder: boolean;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly supabaseService: SupabaseService) { }

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async create(
    notification: Omit<Notification, "id" | "isRead" | "createdAt">,
  ): Promise<Notification> {
    const { userId, type, title, message } = notification;
    const { data, error } = await this.supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToNotification(data);
  }

  async find(
    userId: string,
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
      .eq("user_id", userId);

    if (isRead !== undefined) {
      countQuery = countQuery.eq("is_read", isRead);
    }

    const { count: total, error: countError } = await countQuery;
    if (countError) throw new Error(countError.message);

    // Data query
    let dataQuery = this.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
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

  async findById(id: string, userId: string): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .from("notifications")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? this.mapToNotification(data) : null;
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data ? this.mapToNotification(data) : null;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("notifications")
      .update({ is_read: true }, { count: "exact" })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw new Error(error.message);
    return count || 0;
  }

  async getSettings(userId: string): Promise<NotificationSettings | null> {
    const { data, error } = await this.supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? this.mapToSettings(data) : null;
  }

  async updateSettings(
    userId: string,
    settings: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> {
    const { enableAll, enableBudgetAlert, enableDailyReminder } = settings;

    const { data, error } = await this.supabase
      .from("notification_settings")
      .upsert(
        {
          user_id: userId,
          enable_all: enableAll,
          enable_budget_alert: enableBudgetAlert,
          enable_daily_reminder: enableDailyReminder,
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToSettings(data);
  }

  private mapToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      isRead: row.is_read,
      createdAt: row.created_at,
    };
  }

  private mapToSettings(row: any): NotificationSettings {
    return {
      userId: row.user_id,
      enableAll: row.enable_all,
      enableBudgetAlert: row.enable_budget_alert,
      enableDailyReminder: row.enable_daily_reminder,
    };
  }
}
