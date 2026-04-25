import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_CONNECTION } from "../database/database.module";
import { FindNotificationsDto } from "./dto/find-notifications.dto";

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
  constructor(@Inject(PG_CONNECTION) private readonly pool: Pool) {}

  async create(
    notification: Omit<Notification, "id" | "isRead" | "createdAt">,
  ): Promise<Notification> {
    const { userId, type, title, message } = notification;
    const query = `
      INSERT INTO budget.notifications (user_id, type, title, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const res = await this.pool.query(query, [userId, type, title, message]);
    return this.mapToNotification(res.rows[0]);
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

    let whereClause = "WHERE user_id = $1";
    const queryParams: any[] = [userId];

    if (isRead !== undefined) {
      queryParams.push(isRead);
      whereClause += ` AND is_read = $${queryParams.length}`;
    }

    const countQuery = `SELECT COUNT(*) FROM budget.notifications ${whereClause}`;
    const totalRes = await this.pool.query(countQuery, queryParams);
    const total = parseInt(totalRes.rows[0].count, 10);

    const dataQuery = `
        SELECT * FROM budget.notifications 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const res = await this.pool.query(dataQuery, [
      ...queryParams,
      limit,
      offset,
    ]);

    return {
      notifications: res.rows.map(this.mapToNotification),
      total,
    };
  }

  async findById(id: string, userId: string): Promise<Notification | null> {
    const query = `SELECT * FROM budget.notifications WHERE id = $1 AND user_id = $2`;
    const res = await this.pool.query(query, [id, userId]);
    return res.rowCount > 0 ? this.mapToNotification(res.rows[0]) : null;
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const query = `UPDATE budget.notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`;
    const res = await this.pool.query(query, [id, userId]);
    return res.rowCount > 0 ? this.mapToNotification(res.rows[0]) : null;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const query = `UPDATE budget.notifications SET is_read = true WHERE user_id = $1 AND is_read = false`;
    const res = await this.pool.query(query, [userId]);
    return res.rowCount;
  }

  async getSettings(userId: string): Promise<NotificationSettings | null> {
    const query = `SELECT * FROM budget.notification_settings WHERE user_id = $1`;
    const res = await this.pool.query(query, [userId]);
    return res.rowCount > 0 ? this.mapToSettings(res.rows[0]) : null;
  }

  async updateSettings(
    userId: string,
    settings: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> {
    const { enableAll, enableBudgetAlert, enableDailyReminder } = settings;
    const query = `
      INSERT INTO budget.notification_settings (user_id, enable_all, enable_budget_alert, enable_daily_reminder)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        enable_all = EXCLUDED.enable_all,
        enable_budget_alert = EXCLUDED.enable_budget_alert,
        enable_daily_reminder = EXCLUDED.enable_daily_reminder
      RETURNING *;
    `;
    const res = await this.pool.query(query, [
      userId,
      enableAll,
      enableBudgetAlert,
      enableDailyReminder,
    ]);
    return this.mapToSettings(res.rows[0]);
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
