import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { supabase } from "./supabaseClient";
import { normalizeAxiosError } from "../utils/responseHandler";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

let unauthorizedHandler: (() => Promise<void> | void) | null = null;

export function setUnauthorizedHandler(
  handler: (() => Promise<void> | void) | null,
) {
  unauthorizedHandler = handler;
}

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const isHealthEndpoint = config.url?.includes('/health');

    if (session?.access_token && !isHealthEndpoint) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    const normalizedError = normalizeAxiosError(error);

    if (normalizedError.statusCode === 401 && unauthorizedHandler) {
      await unauthorizedHandler();
    }

    return Promise.reject(normalizedError);
  },
);
