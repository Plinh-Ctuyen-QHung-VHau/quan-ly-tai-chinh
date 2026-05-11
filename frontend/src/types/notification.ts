export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;           
  type: "reminder" | "budget_alert" | "anomaly_alert" | "financial_tip";
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;         
  created_at?: string;
}

export interface NotificationSettings {
  id?: string;
  user_id?: string;
  enable_all: boolean;
  enable_budget_alert: boolean;
  enable_anomaly_alert: boolean;
  enable_daily_reminder: boolean;
  reminder_time?: string | null;
  push_token?: string | null;
  created_at?: string;
  updated_at?: string;
}
