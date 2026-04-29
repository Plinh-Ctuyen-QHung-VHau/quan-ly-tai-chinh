import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { UserProfile, UserSettings } from "../types/user";
import { endpoints } from "./endpoints";

export async function getMyProfile() {
  const response = await apiClient.get(endpoints.users.me);
  return handleApiResponse<UserProfile>(response);
}

export async function updateMyProfile(payload: {
  fullName?: string;
  avatarUrl?: string;
}) {
  const response = await apiClient.put(endpoints.users.me, payload);
  return handleApiResponse<UserProfile>(response);
}

export async function getMySettings() {
  const response = await apiClient.get(endpoints.users.settings);
  return handleApiResponse<UserSettings>(response);
}

export async function updateMySettings(payload: {
  timezone?: string;
  language?: string;
  theme?: "light" | "dark";
  currency?: string;
}) {
  const response = await apiClient.put(endpoints.users.settings, payload);
  return handleApiResponse<UserSettings>(response);
}
