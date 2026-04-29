import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ReminderScheduler } from "./reminder.scheduler";
import { NotificationsModule } from "../notifications/notifications.module";
import { ClientsModule } from "../clients/clients.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationsModule,
    ClientsModule,
  ],
  providers: [ReminderScheduler],
})
export class SchedulerModule {}
