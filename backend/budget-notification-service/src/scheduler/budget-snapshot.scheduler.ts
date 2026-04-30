import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BudgetsService } from "../budgets/budgets.service";
import { BudgetsRepository } from "../budgets/budgets.repository";

@Injectable()
export class BudgetSnapshotScheduler {
  private readonly logger = new Logger(BudgetSnapshotScheduler.name);

  constructor(
    private readonly budgetsService: BudgetsService,
    private readonly budgetsRepository: BudgetsRepository,
  ) {}

  /**
   * Chạy mỗi giờ một lần để ghi nhận trạng thái ngân sách của tất cả người dùng.
   * Điều này giúp bảng budget_snapshots có đầy đủ dữ liệu lịch sử.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateAllBudgetSnapshots() {
    this.logger.log("Starting background budget snapshot update for all active budgets...");

    try {
      const activeBudgets = await this.budgetsRepository.findAllActiveBudgets();
      this.logger.log(`Found ${activeBudgets.length} active budgets to update.`);

      for (const budget of activeBudgets) {
        try {
          // getCurrentStatus đã chứa logic ghi snapshot
          await this.budgetsService.getCurrentStatus(budget.user_id);
        } catch (err) {
          this.logger.error(`Failed to update snapshot for budget ${budget.id}: ${err.message}`);
        }
      }

      this.logger.log("Background budget snapshot update completed.");
    } catch (err) {
      this.logger.error("Global budget snapshot update cron failed:", err);
    }
  }
}
