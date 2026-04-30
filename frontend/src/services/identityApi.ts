import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { invalidateData } from "../utils/dataInvalidation";
import { UserProfile, UserSettings } from "../types/user";
import { endpoints } from "./endpoints";

export async function getMyProfile() {
  const response = await apiClient.get(endpoints.users.me);
  return handleApiResponse<UserProfile>(response);
}

export async function updateMyProfile(payload: {
  full_name?: string;
  avatar_url?: string;
}) {
  const response = await apiClient.put(endpoints.users.me, payload);
  const result = handleApiResponse<UserProfile>(response);
  invalidateData("profile");
  return result;
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
  const result = handleApiResponse<UserSettings>(response);
  invalidateData("settings");
  return result;
}
