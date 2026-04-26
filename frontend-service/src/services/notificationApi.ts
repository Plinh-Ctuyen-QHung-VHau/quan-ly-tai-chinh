import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { Notification, NotificationSettings } from "../types/notification";
import { endpoints } from "./endpoints";

export async function getNotifications() {
  const response = await apiClient.get(endpoints.notifications.list);
  return handleApiResponse<Notification[]>(response);
}

export async function markNotificationAsRead(id: string) {
  const response = await apiClient.put(endpoints.notifications.markRead(id));
  return handleApiResponse<Notification>(response);
}

export async function markAllNotificationsAsRead() {
  const response = await apiClient.put(endpoints.notifications.readAll);
  return handleApiResponse<{ updated: number }>(response);
}

export async function getNotificationSettings() {
  const response = await apiClient.get(endpoints.notifications.settings);
  return handleApiResponse<NotificationSettings>(response);
}

export async function updateNotificationSettings(
  payload: NotificationSettings,
) {
  const response = await apiClient.put(endpoints.notifications.updateSettings, payload);
  return handleApiResponse<NotificationSettings>(response);
}
