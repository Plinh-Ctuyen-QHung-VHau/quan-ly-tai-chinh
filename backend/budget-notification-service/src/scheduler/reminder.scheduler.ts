import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationsRepository } from "../notifications/notifications.repository";
import { TransactionClient } from "../clients/transaction.client";

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly transactionClient: TransactionClient,
  ) {}

  /**
   * Chạy mỗi ngày lúc 20:00 (giờ server).
   * Gửi nhắc nhở cho user chưa có giao dịch hôm nay
   * và có enable_daily_reminder = true.
   */
  @Cron("* * * * *")
  async runDailyReminderForAllUsers() {
    const now = new Date();
    const vnTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const hh = String(vnTime.getHours()).padStart(2, '0');
    const mm = String(vnTime.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    try {
      const eligibleUsers = await this.notificationsRepository.getUsersForReminder(timeStr);
      
      if (eligibleUsers.length === 0) return;

      this.logger.log(`[${timeStr}] Found ${eligibleUsers.length} users eligible for reminder`);

      for (const userId of eligibleUsers) {
        try {
          // Kiểm tra user có giao dịch hôm nay không
          const today = new Date().toISOString().slice(0, 10);
          let hasTransactionsToday = false;

          try {
            const summary = await this.transactionClient.getTransactionSummary(userId, today, today);
            hasTransactionsToday = (summary.total_income + summary.total_expense) > 0;
          } catch {
            // Nếu không lấy được summary, cứ gửi reminder
            hasTransactionsToday = false;
          }

          await this.notificationsService.runDailyReminderCheck(userId, hasTransactionsToday);
        } catch (err) {
          this.logger.error(`Failed to send reminder for user ${userId}:`, err);
        }
      }
    } catch (err) {
      this.logger.error("Daily reminder cron failed:", err);
    }
  }
}
