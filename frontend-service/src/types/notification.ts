/** budget.notifications — DB schema match */
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;           // NOT "message"
  type: "reminder" | "budget_alert" | "anomaly_alert" | "financial_tip";
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;          // boolean, NOT read_at string
  created_at?: string;
}

/** budget.notification_settings — DB schema match */
export interface NotificationSettings {
  id?: string;
  user_id?: string;
  enable_all: boolean;
  enable_budget_alert: boolean;
  enable_anomaly_alert: boolean;
  enable_daily_reminder: boolean;
  reminder_time?: string | null; // DB type: time, nullable
  created_at?: string;
  updated_at?: string;
  // NOTE: alert_80_sent / alert_100_sent belong to budget.budgets, NOT here
}
