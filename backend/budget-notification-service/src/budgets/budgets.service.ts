import { Injectable, NotFoundException } from "@nestjs/common";
import { BudgetsRepository } from "./budgets.repository";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";
import { TransactionClient } from "../clients/transaction.client";
import { NotificationsService } from "../notifications/notifications.service";
import { EventPublisher } from "../events/event.publisher";
import { AppMetrics } from "../metrics/app.metrics";
import { AppError } from "../shared/errors/AppError";

@Injectable()
export class BudgetsService {
  constructor(
    private readonly budgetsRepository: BudgetsRepository,
    private readonly transactionClient: TransactionClient,
    private readonly notificationsService: NotificationsService,
    private readonly eventPublisher: EventPublisher,
    private readonly metrics: AppMetrics,
  ) {}

  async create(userId: string, createBudgetDto: CreateBudgetDto) {
    const budget = await this.budgetsRepository.create(userId, createBudgetDto);
    this.metrics.budgetsCreatedTotal.inc();
    return budget;
  }

  async findCurrent(userId: string) {
    const budget = await this.budgetsRepository.findCurrentActive(userId);
    if (!budget) {
      throw new NotFoundException(
        "No active budget found for the current period.",
      );
    }
    return budget;
  }

  async getCurrentStatus(userId: string) {
    const budget = await this.findCurrent(userId);

    const summary = await this.transactionClient.getTransactionSummary(
      userId,
      budget.startDate.toISOString(),
      budget.endDate.toISOString(),
    );

    const spentAmount = summary.totalSpent || 0;
    const budgetAmount = budget.budgetAmount;
    const remainingAmount = budgetAmount - spentAmount;
    const percentUsed =
      budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

    const status = {
      budgetId: budget.id,
      budgetAmount,
      spentAmount,
      remainingAmount,
      percentUsed,
      status: budget.status,
      startDate: budget.startDate,
      endDate: budget.endDate,
    };

    // Check and trigger alerts
    await this.checkBudgetThresholds(budget, status);

    return status;
  }

  async update(id: string, userId: string, updateBudgetDto: UpdateBudgetDto) {
    const budget = await this.budgetsRepository.update(
      id,
      userId,
      updateBudgetDto,
    );
    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found.`);
    }
    this.metrics.budgetsUpdatedTotal.inc();
    return budget;
  }

  async remove(id: string, userId: string) {
    const success = await this.budgetsRepository.softDelete(id, userId);
    if (!success) {
      throw new NotFoundException(`Budget with ID ${id} not found.`);
    }
    this.metrics.budgetsDeletedTotal.inc();
    return { success: true, message: "Budget deleted successfully." };
  }

  private async checkBudgetThresholds(budget, status) {
    // 100% threshold
    if (status.percentUsed >= 100 && !budget.alert100Sent) {
      await this.notificationsService.createBudgetAlert(
        budget.userId,
        budget,
        status.spentAmount,
        100,
      );
      await this.budgetsRepository.updateAlertSent(budget.id, "100");
      await this.budgetsRepository.updateStatus(budget.id, "exceeded");
      await this.eventPublisher.publish("budget.exceeded", {
        budgetId: budget.id,
        userId: budget.userId,
      });
      this.metrics.budgetExceededTotal.inc();
      this.metrics.budgetThresholdReachedTotal.inc({ threshold: "100" });
    }
    // 80% threshold
    else if (status.percentUsed >= 80 && !budget.alert80Sent) {
      await this.notificationsService.createBudgetAlert(
        budget.userId,
        budget,
        status.spentAmount,
        80,
      );
      await this.budgetsRepository.updateAlertSent(budget.id, "80");
      await this.eventPublisher.publish("budget.threshold.reached", {
        budgetId: budget.id,
        userId: budget.userId,
        threshold: 80,
      });
      this.metrics.budgetThresholdReachedTotal.inc({ threshold: "80" });
    }
  }
}
