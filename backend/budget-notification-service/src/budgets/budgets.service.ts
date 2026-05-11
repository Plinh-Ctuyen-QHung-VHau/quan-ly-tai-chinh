import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { BudgetsRepository } from "./budgets.repository";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";
import { TransactionClient } from "../clients/transaction.client";
import { NotificationsService } from "../notifications/notifications.service";
import { EventPublisher } from "@shared/events/event.publisher";
import { AppMetrics } from "../metrics/app.metrics";
import { AppError } from "@shared/errors/AppError";

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    private readonly budgetsRepository: BudgetsRepository,
    private readonly transactionClient: TransactionClient,
    private readonly notificationsService: NotificationsService,
    private readonly eventPublisher: EventPublisher,
    private readonly metrics: AppMetrics,
  ) { }

  async create(user_id: string, createBudgetDto: CreateBudgetDto) {
    const budget = await this.budgetsRepository.create(
      user_id,
      createBudgetDto,
    );
    this.metrics.budgetsCreatedTotal.inc();
    this.eventPublisher.publish("budget.created", budget, "budget-notification-service").catch(err => console.error(err));
    return budget;
  }

  async findCurrent(user_id: string) {
    const budget = await this.budgetsRepository.findCurrentActive(user_id);
    if (!budget) {
      throw new NotFoundException(
        "Không tìm thấy ngân sách nào đang hoạt động trong kỳ này.",
      );
    }
    return budget;
  }

  async getCurrentStatus(user_id: string) {
    const budget = await this.findCurrent(user_id);

    const summary = await this.transactionClient.getTransactionSummary(
      user_id,
      budget.start_date instanceof Date ? budget.start_date.toISOString().split('T')[0] : String(budget.start_date),
      budget.end_date instanceof Date ? budget.end_date.toISOString().split('T')[0] : String(budget.end_date),
    );

    const spent_amount = summary.total_expense || 0;
    const budget_amount = budget.budget_amount;
    const remaining_amount = budget_amount - spent_amount;
    const percent_used =
      budget_amount > 0 ? (spent_amount / budget_amount) * 100 : 0;

    let frontendStatus: "healthy" | "warning" | "danger";
    if (percent_used >= 100) {
      frontendStatus = "danger";
    } else if (percent_used >= 80) {
      frontendStatus = "warning";
    } else {
      frontendStatus = "healthy";
    }

    const roundedPercent = Math.round(percent_used * 100) / 100;

    const status = {
      id: budget.id,
      budget_amount,
      spent_amount,
      remaining_amount,
      percent_used: roundedPercent,
      status: frontendStatus,
      budget_period: budget.budget_period,
      start_date: budget.start_date,
      end_date: budget.end_date,
    };

    try {
      await this.budgetsRepository.createSnapshot({
        budget_id: budget.id,
        user_id: budget.user_id,
        spent_amount,
        remaining_amount,
        percent_used: roundedPercent,
      });
      this.logger.log(
        `Đã lưu snapshot ngân sách: budget=${budget.id}, đã tiêu=${spent_amount}, còn lại=${remaining_amount}, mức sử dụng=${roundedPercent}%`,
      );
    } catch (err) {
      this.logger.warn(`Lưu snapshot ngân sách thất bại (không sao, không chặn user): ${err.message}`);
    }

    await this.checkBudgetThresholds(budget, status);

    return status;
  }

  async update(id: string, user_id: string, updateBudgetDto: UpdateBudgetDto) {
    const budget = await this.budgetsRepository.update(
      id,
      user_id,
      updateBudgetDto,
    );
    if (!budget) {
      throw new NotFoundException(`Không tìm thấy ngân sách có ID ${id}.`);
    }
    this.metrics.budgetsUpdatedTotal.inc();
    this.eventPublisher.publish("budget.updated", budget, "budget-notification-service").catch(err => console.error(err));
    return budget;
  }

  async remove(id: string, user_id: string) {
    const budget = await this.budgetsRepository.findCurrentActive(user_id);
    const success = await this.budgetsRepository.softDelete(id, user_id);
    if (!success) {
      throw new NotFoundException(`Không tìm thấy ngân sách có ID ${id}.`);
    }
    this.metrics.budgetsDeletedTotal.inc();
    this.eventPublisher.publish("budget.deleted", { id, user_id }, "budget-notification-service").catch(err => console.error(err));
    return { success: true, message: "Đã xóa ngân sách." };
  }

  async getHistory(user_id: string, limit?: number) {
    const budget = await this.budgetsRepository.findCurrentActive(user_id);
    if (!budget) return [];
    return this.budgetsRepository.getSnapshotHistory(budget.id, user_id, limit);
  }

  private async checkBudgetThresholds(budget, status) {
    if (status.percent_used >= 100 && !budget.alert_100_sent) {
      const notification = await this.notificationsService.createBudgetAlert(
        budget.user_id,
        budget.id,
        100,
      );
      if (notification) {
        await this.budgetsRepository.updateAlertSent(budget.id, "100");
        await this.budgetsRepository.updateStatus(budget.id, "exceeded");
        await this.eventPublisher.publish("budget.exceeded", {
          budget_id: budget.id,
          user_id: budget.user_id,
        }, "budget-notification-service");
        this.metrics.budgetExceededTotal.inc();
        this.metrics.budgetThresholdReachedTotal.inc({ threshold: "100" });
      }
    }
    else if (status.percent_used >= 80 && !budget.alert_80_sent) {
      const notification = await this.notificationsService.createBudgetAlert(
        budget.user_id,
        budget.id,
        80,
      );
      if (notification) {
        await this.budgetsRepository.updateAlertSent(budget.id, "80");
        await this.eventPublisher.publish("budget.threshold.reached", {
          budget_id: budget.id,
          user_id: budget.user_id,
          threshold: 80,
        }, "budget-notification-service");
        this.metrics.budgetThresholdReachedTotal.inc({ threshold: "80" });
      }
    }
  }
}
