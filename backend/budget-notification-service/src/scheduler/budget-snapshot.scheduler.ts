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
    this.logger.log("Bắt đầu tiến trình ngầm để chụp lại trạng thái tất cả ngân sách...");

    try {
      const activeBudgets = await this.budgetsRepository.findAllActiveBudgets();
      this.logger.log(`Tìm thấy ${activeBudgets.length} ngân sách đang hoạt động để cập nhật.`);

      for (const budget of activeBudgets) {
        try {

          await this.budgetsService.getCurrentStatus(budget.user_id);
        } catch (err) {
          this.logger.error(`Lỗi khi chụp snapshot cho budget ${budget.id}: ${err.message}`);
        }
      }

      this.logger.log("Đã chạy xong tiến trình chụp snapshot ngân sách ngầm.");
    } catch (err) {
      this.logger.error("Tiến trình cron chạy snapshot ngân sách tổng bị lỗi:", err);
    }
  }
}
