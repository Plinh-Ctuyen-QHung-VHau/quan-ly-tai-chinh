export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface UserSettings {
  id?: string;
  user_id?: string;
  timezone: string;
  language: string;
  theme: "light" | "dark";
  currency: string;
  created_at?: string;
  updated_at?: string;
}
