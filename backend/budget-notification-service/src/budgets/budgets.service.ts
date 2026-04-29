import { Injectable, NotFoundException } from "@nestjs/common";
import { BudgetsRepository } from "./budgets.repository";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";
import { TransactionClient } from "../clients/transaction.client";
import { NotificationsService } from "../notifications/notifications.service";
import { EventPublisher } from "../events/event.publisher";
import { AppMetrics } from "../metrics/app.metrics";
import { AppError } from "@shared/errors/AppError";

@Injectable()
export class BudgetsService {
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
    return budget;
  }

  async findCurrent(user_id: string) {
    const budget = await this.budgetsRepository.findCurrentActive(user_id);
    if (!budget) {
      throw new NotFoundException(
        "No active budget found for the current period.",
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

    const spent_amount = summary.totalExpense || 0;
    const budget_amount = budget.budget_amount;
    const remaining_amount = budget_amount - spent_amount;
    const percent_used =
      budget_amount > 0 ? (spent_amount / budget_amount) * 100 : 0;

    const status = {
      budget_id: budget.id,
      budget_amount,
      spent_amount: spent_amount,
      remaining_amount: remaining_amount,
      percent_used: Math.round(percent_used * 100) / 100,
      status: budget.status,
      start_date: budget.start_date,
      end_date: budget.end_date,
    };

    // Check and trigger alerts
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
      throw new NotFoundException(`Budget with ID ${id} not found.`);
    }
    this.metrics.budgetsUpdatedTotal.inc();
    return budget;
  }

  async remove(id: string, user_id: string) {
    const success = await this.budgetsRepository.softDelete(id, user_id);
    if (!success) {
      throw new NotFoundException(`Budget with ID ${id} not found.`);
    }
    this.metrics.budgetsDeletedTotal.inc();
    return { success: true, message: "Budget deleted successfully." };
  }

  private async checkBudgetThresholds(budget, status) {
    // 100% threshold
    if (status.percent_used >= 100 && !budget.alert_100_sent) {
      await this.notificationsService.createBudgetAlert(
        budget.user_id,
        budget,
        status.spent_amount,
        100,
      );
      await this.budgetsRepository.updateAlertSent(budget.id, "100");
      await this.budgetsRepository.updateStatus(budget.id, "exceeded");
      await this.eventPublisher.publish("budget.exceeded", {
        budgetId: budget.id,
        user_id: budget.user_id,
      });
      this.metrics.budgetExceededTotal.inc();
      this.metrics.budgetThresholdReachedTotal.inc({ threshold: "100" });
    }
    // 80% threshold
    else if (status.percent_used >= 80 && !budget.alert_80_sent) {
      await this.notificationsService.createBudgetAlert(
        budget.user_id,
        budget,
        status.spent_amount,
        80,
      );
      await this.budgetsRepository.updateAlertSent(budget.id, "80");
      await this.eventPublisher.publish("budget.threshold.reached", {
        budgetId: budget.id,
        user_id: budget.user_id,
        threshold: 80,
      });
      this.metrics.budgetThresholdReachedTotal.inc({ threshold: "80" });
    }
  }
}
