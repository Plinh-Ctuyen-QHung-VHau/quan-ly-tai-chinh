import { Injectable } from "@nestjs/common";
import { Counter, register, collectDefaultMetrics } from "prom-client";

@Injectable()
export class AppMetrics {
  public readonly usersCreatedTotal: Counter;
  public readonly usersDeletedTotal: Counter;
  public readonly authFailuresTotal: Counter;
  public readonly passwordResetRequestsTotal: Counter;

  constructor() {
    // Ensure metrics are not registered multiple times
    if (register.getSingleMetric("identity_service_users_created_total")) {
      this.usersCreatedTotal = register.getSingleMetric(
        "identity_service_users_created_total",
      ) as Counter;
      this.usersDeletedTotal = register.getSingleMetric(
        "identity_service_users_deleted_total",
      ) as Counter;
      this.authFailuresTotal = register.getSingleMetric(
        "identity_service_auth_failures_total",
      ) as Counter;
      this.passwordResetRequestsTotal = register.getSingleMetric(
        "identity_service_password_reset_requests_total",
      ) as Counter;
    } else {
      this.usersCreatedTotal = new Counter({
        name: "identity_service_users_created_total",
        help: "Total number of users created",
        labelNames: ["provider"],
      });
      this.usersDeletedTotal = new Counter({
        name: "identity_service_users_deleted_total",
        help: "Total number of users deleted",
      });
      this.authFailuresTotal = new Counter({
        name: "identity_service_auth_failures_total",
        help: "Total number of authentication failures",
        labelNames: ["reason"],
      });
      this.passwordResetRequestsTotal = new Counter({
        name: "identity_service_password_reset_requests_total",
        help: "Total number of password reset requests",
      });
      collectDefaultMetrics();
    }
  }
}
