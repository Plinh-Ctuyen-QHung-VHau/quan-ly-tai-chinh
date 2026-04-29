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
  @Cron("0 20 * * *")
  async runDailyReminderForAllUsers() {
    this.logger.log("Running daily reminder check for all eligible users...");

    try {
      // Lấy tất cả user có enable_daily_reminder = true và enable_all = true
      const eligibleUsers = await this.notificationsRepository.getUsersWithDailyReminderEnabled();

      this.logger.log(`Found ${eligibleUsers.length} users eligible for daily reminder`);

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
