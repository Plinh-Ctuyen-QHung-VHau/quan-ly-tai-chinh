import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { Notification, NotificationSettings } from "../types/notification";

export async function getNotifications() {
  const response = await apiClient.get("/api/notifications");
  return handleApiResponse<Notification[]>(response);
}

export async function markNotificationAsRead(id: string) {
  const response = await apiClient.put(`/api/notifications/${id}/read`);
  return handleApiResponse<Notification>(response);
}

export async function markAllNotificationsAsRead() {
  const response = await apiClient.put("/api/notifications/read-all");
  return handleApiResponse<{ updated: number }>(response);
}

export async function getNotificationSettings() {
  const response = await apiClient.get("/api/notifications/settings");
  return handleApiResponse<NotificationSettings>(response);
}

export async function updateNotificationSettings(
  payload: NotificationSettings,
) {
  const response = await apiClient.put("/api/notifications/settings", payload);
  return handleApiResponse<NotificationSettings>(response);
}
