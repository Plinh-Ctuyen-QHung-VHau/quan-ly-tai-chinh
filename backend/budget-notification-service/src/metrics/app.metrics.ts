import { Inject, Injectable } from "@nestjs/common";
import { Counter } from "prom-client";
import { METRICS_PREFIX } from "./metrics.constants";

@Injectable()
export class AppMetrics {
  public readonly budgetsCreatedTotal: Counter<string>;
  public readonly budgetsUpdatedTotal: Counter<string>;
  public readonly budgetsDeletedTotal: Counter<string>;
  public readonly budgetThresholdReachedTotal: Counter<string>;
  public readonly budgetExceededTotal: Counter<string>;
  public readonly notificationsCreatedTotal: Counter<string>;
  public readonly notificationsReadTotal: Counter<string>;

  constructor() {
    this.budgetsCreatedTotal = new Counter({
      name: `${METRICS_PREFIX}_budgets_created_total`,
      help: "Total number of budgets created",
    });
    this.budgetsUpdatedTotal = new Counter({
      name: `${METRICS_PREFIX}_budgets_updated_total`,
      help: "Total number of budgets updated",
    });
    this.budgetsDeletedTotal = new Counter({
      name: `${METRICS_PREFIX}_budgets_deleted_total`,
      help: "Total number of budgets deleted",
    });
    this.budgetThresholdReachedTotal = new Counter({
      name: `${METRICS_PREFIX}_budget_threshold_reached_total`,
      help: "Total number of times a budget threshold was reached",
      labelNames: ["threshold"],
    });
    this.budgetExceededTotal = new Counter({
      name: `${METRICS_PREFIX}_budget_exceeded_total`,
      help: "Total number of times a budget was exceeded",
    });
    this.notificationsCreatedTotal = new Counter({
      name: `${METRICS_PREFIX}_notifications_created_total`,
      help: "Total number of notifications created",
      labelNames: ["type"],
    });
    this.notificationsReadTotal = new Counter({
      name: `${METRICS_PREFIX}_notifications_read_total`,
      help: "Total number of notifications marked as read",
    });
  }
}
