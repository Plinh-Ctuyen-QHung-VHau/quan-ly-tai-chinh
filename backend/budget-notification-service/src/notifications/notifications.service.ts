import { Injectable, NotFoundException } from "@nestjs/common";
import {
  NotificationsRepository,
  NotificationSettings,
} from "./notifications.repository";
import { FindNotificationsDto } from "./dto/find-notifications.dto";
import { UpdateNotificationSettingsDto } from "./dto/update-notification-settings.dto";
import { AppMetrics } from "../metrics/app.metrics";
import { AppError } from "@shared/errors/AppError";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly metrics: AppMetrics,
  ) { }

  async createBudgetAlert(
    user_id: string,
    budget: { budget_amount: number; budget_period: "weekly" | "monthly" },
    spent: number,
    threshold: 80 | 100,
  ) {
    const settings = await this.getSettings(user_id);
    if (!settings.enable_all || !settings.enable_budget_alert) {
      return; // Do not create notification if disabled
    }

    const title = `Budget Alert: ${threshold}% Threshold Reached`;
    const content = `You have spent ${spent} of your ${budget.budget_period} budget of ${budget.budget_amount}. That's over ${threshold}%!`;

    const notification = await this.notificationsRepository.create({
      user_id,
      type: "budget_alert",
      title,
      content,
    });

    this.metrics.notificationsCreatedTotal.inc({ type: "budget_alert" });
    return notification;
  }

  async find(user_id: string, findDto: FindNotificationsDto) {
    return this.notificationsRepository.find(user_id, findDto);
  }

  async findById(id: string, user_id: string) {
    const notification = await this.notificationsRepository.findById(
      id,
      user_id,
    );
    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }
    return notification;
  }

  async markAsRead(id: string, user_id: string) {
    const notification = await this.notificationsRepository.markAsRead(
      id,
      user_id,
    );
    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }
    this.metrics.notificationsReadTotal.inc();
    return notification;
  }

  async markAllAsRead(user_id: string) {
    const count = await this.notificationsRepository.markAllAsRead(user_id);
    this.metrics.notificationsReadTotal.inc(count);
    return { markedAsReadCount: count };
  }

  async getSettings(user_id: string): Promise<NotificationSettings> {
    let settings = await this.notificationsRepository.getSettings(user_id);
    if (!settings) {
      // Create default settings if they don't exist
      settings = await this.notificationsRepository.updateSettings(user_id, {
        enable_all: true,
        enable_budget_alert: true,
        enable_anomaly_alert: true,
        enable_daily_reminder: true,
      });
    }
    return settings;
  }

  async updateSettings(
    user_id: string,
    updateDto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsRepository.updateSettings(user_id, updateDto);
  }
}
