export interface Notification {
  id: string;
  title: string;
  message: string;
  read_at?: string | null;
  created_at?: string;
  type?: "budget" | "anomaly" | "reminder" | "system";
}

export interface NotificationSettings {
  id?: string;
  enable_all: boolean;
  enable_budget_alert: boolean;
  alert_80_sent: boolean;
  alert_100_sent: boolean;
  enable_anomaly_alert: boolean;
  enable_daily_reminder: boolean;
  reminder_time: string;
}
