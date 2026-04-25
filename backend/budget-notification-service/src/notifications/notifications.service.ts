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
  ) {}

  async createBudgetAlert(
    userId: string,
    budget: { budgetAmount: number; budgetPeriod: "weekly" | "monthly" },
    spent: number,
    threshold: 80 | 100,
  ) {
    const settings = await this.getSettings(userId);
    if (!settings.enableAll || !settings.enableBudgetAlert) {
      return; // Do not create notification if disabled
    }

    const title = `Budget Alert: ${threshold}% Threshold Reached`;
    const message = `You have spent ${spent} of your ${budget.budgetPeriod} budget of ${budget.budgetAmount}. That's over ${threshold}%!`;

    const notification = await this.notificationsRepository.create({
      userId,
      type: "budget_alert",
      title,
      message,
    });

    this.metrics.notificationsCreatedTotal.inc({ type: "budget_alert" });
    return notification;
  }

  async find(userId: string, findDto: FindNotificationsDto) {
    return this.notificationsRepository.find(userId, findDto);
  }

  async findById(id: string, userId: string) {
    const notification = await this.notificationsRepository.findById(
      id,
      userId,
    );
    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }
    return notification;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationsRepository.markAsRead(
      id,
      userId,
    );
    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }
    this.metrics.notificationsReadTotal.inc();
    return notification;
  }

  async markAllAsRead(userId: string) {
    const count = await this.notificationsRepository.markAllAsRead(userId);
    this.metrics.notificationsReadTotal.inc(count);
    return { markedAsReadCount: count };
  }

  async getSettings(userId: string): Promise<NotificationSettings> {
    let settings = await this.notificationsRepository.getSettings(userId);
    if (!settings) {
      // Create default settings if they don't exist
      settings = await this.notificationsRepository.updateSettings(userId, {
        enableAll: true,
        enableBudgetAlert: true,
        enableDailyReminder: true,
      });
    }
    return settings;
  }

  async updateSettings(
    userId: string,
    updateDto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsRepository.updateSettings(userId, updateDto);
  }
}
