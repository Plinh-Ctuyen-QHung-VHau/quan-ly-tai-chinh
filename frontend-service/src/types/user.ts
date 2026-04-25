export interface UserProfile {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface UserSettings {
  id?: string;
  userId?: string;
  enablePushNotifications: boolean;
  preferredLanguage: string;
  theme: "light" | "dark" | "system";
  updatedAt?: string;
}
