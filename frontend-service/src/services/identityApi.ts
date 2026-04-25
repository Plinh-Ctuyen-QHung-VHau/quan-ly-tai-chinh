import { apiClient } from "./apiClient";
import { handleApiResponse } from "../utils/responseHandler";
import { UserProfile } from "../types/user";

export async function getMyProfile() {
  const response = await apiClient.get("/api/users/me");
  return handleApiResponse<UserProfile>(response);
}

export async function updateMyProfile(
  payload: Pick<UserProfile, "fullName" | "avatarUrl">,
) {
  const response = await apiClient.put("/api/users/me", payload);
  return handleApiResponse<UserProfile>(response);
}
