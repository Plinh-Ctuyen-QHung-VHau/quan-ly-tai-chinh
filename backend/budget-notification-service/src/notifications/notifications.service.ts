import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  NotificationsRepository,
  NotificationSettings,
  CreateNotificationInput,
} from "./notifications.repository";
import { FindNotificationsDto } from "./dto/find-notifications.dto";
import { UpdateNotificationSettingsDto } from "./dto/update-notification-settings.dto";
import { AppMetrics } from "../metrics/app.metrics";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { EventPublisher } from "@shared/events/event.publisher";

type NotificationType = "reminder" | "budget_alert" | "anomaly_alert" | "financial_tip";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

export interface AnomalyEvent {
  anomalyId?: string;
  transactionId?: string;
  userId: string;
  anomalyType?: string;
  anomalyScore?: number;
  severity?: string;
  reason?: string;
  actualValue?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly metrics: AppMetrics,
    private readonly httpService: HttpService,
    private readonly eventPublisher: EventPublisher,
  ) { }

  // ═══════════════════════════════════════════════════════════════════
  // GENERIC CREATE (checks settings before creating)
  // ═══════════════════════════════════════════════════════════════════

  async createNotification(params: CreateNotificationParams) {
    const { userId, title, content, type, relatedEntityType, relatedEntityId } = params;

    if (!title || !content || !type) {
      this.logger.warn("createNotification called with missing title/content/type");
      return null;
    }

    // Check user settings
    const settings = await this.getOrCreateSettings(userId);

    if (!settings.enable_all) {
      this.logger.debug(`Notification blocked for user ${userId}: enable_all=false`);
      return null;
    }

    if (type === "budget_alert" && !settings.enable_budget_alert) {
      this.logger.debug(`budget_alert blocked for user ${userId}`);
      return null;
    }
    if (type === "anomaly_alert" && !settings.enable_anomaly_alert) {
      this.logger.debug(`anomaly_alert blocked for user ${userId}`);
      return null;
    }
    if (type === "reminder" && !settings.enable_daily_reminder) {
      this.logger.debug(`reminder blocked for user ${userId}`);
      return null;
    }

    const input: CreateNotificationInput = {
      user_id: userId,
      title,
      content,
      type,
      related_entity_type: relatedEntityType ?? null,
      related_entity_id: relatedEntityId ?? null,
    };

    const notification = await this.notificationsRepository.create(input);
    this.metrics.notificationsCreatedTotal.inc({ type });
    this.eventPublisher.publish("notification.created", notification, "budget-notification-service").catch(err => console.error(err));

    // Send push notification if push_token exists
    if (settings.push_token) {
      await this.sendPushNotification(settings.push_token, title, content, {
        type,
        relatedEntityType,
        relatedEntityId,
      });
    }

    return notification;
  }

  private async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: any,
  ) {
    try {
      await firstValueFrom(
        this.httpService.post("https://exp.host/--/api/v2/push/send", {
          to: token,
          sound: "default",
          title,
          body,
          data,
        }),
      );
      this.logger.debug(`Push notification sent to ${token}`);
    } catch (error: any) {
      this.logger.error("Failed to send push notification:", error.response?.data || error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // BUDGET ALERT
  // ═══════════════════════════════════════════════════════════════════

  async createBudgetAlert(
    userId: string,
    budget_id: string,
    threshold: 80 | 100,
  ) {
    const title = threshold >= 100 ? "Vượt ngân sách" : "Cảnh báo ngân sách";
    const content =
      threshold >= 100
        ? "Bạn đã vượt ngân sách kỳ này."
        : "Bạn đã sử dụng hơn 80% ngân sách kỳ này.";

    return this.createNotification({
      userId,
      title,
      content,
      type: "budget_alert",
      relatedEntityType: "budget",
      relatedEntityId: budget_id,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // ANOMALY ALERT
  // ═══════════════════════════════════════════════════════════════════

  async handleAnomalyDetected(event: AnomalyEvent) {
    const content =
      event.reason || "Khoản chi này cao hơn mức thông thường của bạn.";

    const relatedEntityType = event.anomalyId ? "anomaly" : "transaction";
    const relatedEntityId = event.anomalyId || event.transactionId || null;

    return this.createNotification({
      userId: event.userId,
      title: "Cảnh báo chi tiêu bất thường",
      content,
      type: "anomaly_alert",
      relatedEntityType,
      relatedEntityId,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // DAILY REMINDER (call via cron/scheduler)
  // ═══════════════════════════════════════════════════════════════════

  async runDailyReminderCheck(
    userId: string,
    hasTransactionsToday: boolean,
  ) {
    if (hasTransactionsToday) {
      this.logger.debug(`User ${userId} already has transactions today, skip reminder`);
      return null;
    }

    // Check if reminder already sent today
    const alreadySent = await this.notificationsRepository.hasReminderToday(userId);
    if (alreadySent) {
      this.logger.debug(`Reminder already sent today for user ${userId}`);
      return null;
    }

    return this.createNotification({
      userId,
      title: "Nhắc cập nhật giao dịch",
      content: "Bạn chưa cập nhật giao dịch hôm nay.",
      type: "reminder",
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════════════════════════════════

  async find(userId: string, findDto: FindNotificationsDto) {
    const { notifications, total } = await this.notificationsRepository.find(userId, findDto);
    const page = findDto.page || 1;
    const limit = findDto.limit || 10;
    const totalPages = Math.ceil(total / limit);

    return {
      items: notifications,
      meta: {
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    };
  }

  async findById(id: string, userId: string) {
    const notification = await this.notificationsRepository.findById(id, userId);
    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }
    return notification;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationsRepository.markAsRead(id, userId);
    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }
    this.metrics.notificationsReadTotal.inc();
    this.eventPublisher.publish("notification.updated", notification, "budget-notification-service").catch(err => console.error(err));
    return notification;
  }

  async markAllAsRead(userId: string) {
    const count = await this.notificationsRepository.markAllAsRead(userId);
    this.metrics.notificationsReadTotal.inc(count);
    this.eventPublisher.publish("notification.updated_all", { user_id: userId, count }, "budget-notification-service").catch(err => console.error(err));
    return { markedAsReadCount: count };
  }

  // ═══════════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════════

  async getSettings(userId: string): Promise<NotificationSettings> {
    return this.getOrCreateSettings(userId);
  }

  async updateSettings(userId: string, updateDto: UpdateNotificationSettingsDto) {
    const settings = await this.notificationsRepository.updateSettings(userId, updateDto);
    this.eventPublisher.publish("notification_settings.updated", settings, "budget-notification-service").catch(err => console.error(err));
    return settings;
  }

  private async getOrCreateSettings(userId: string): Promise<NotificationSettings> {
    let settings = await this.notificationsRepository.getSettings(userId);
    if (!settings) {
      settings = await this.notificationsRepository.updateSettings(userId, {
        enable_all: true,
        enable_budget_alert: true,
        enable_anomaly_alert: true,
        enable_daily_reminder: true,
        reminder_time: "20:00:00",
      });
    }
    return settings;
  }
}
