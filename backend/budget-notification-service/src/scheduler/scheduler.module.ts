import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ReminderScheduler } from "./reminder.scheduler";
import { BudgetSnapshotScheduler } from "./budget-snapshot.scheduler";
import { NotificationsModule } from "../notifications/notifications.module";
import { ClientsModule } from "../clients/clients.module";
import { BudgetsModule } from "../budgets/budgets.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationsModule,
    ClientsModule,
    BudgetsModule,
  ],
  providers: [ReminderScheduler, BudgetSnapshotScheduler],
})
export class SchedulerModule {}
