export interface Notification {
  id: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt?: string;
  type?: "budget" | "anomaly" | "reminder" | "system";
}

export interface NotificationSettings {
  id?: string;
  enableAll: boolean;
  enableBudgetAlert: boolean;
  enableAnomalyAlert: boolean;
  enableDailyReminder: boolean;
  reminderTime: string;
}
