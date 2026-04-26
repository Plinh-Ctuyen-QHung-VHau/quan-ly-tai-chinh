import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { supabase } from "./supabaseClient";
import { normalizeAxiosError } from "../utils/responseHandler";
import { endpoints } from "./endpoints";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!baseURL && __DEV__) {
  console.warn(
    "EXPO_PUBLIC_API_BASE_URL is not set. Falling back to local LAN IP: http://192.168.1.110:3000",
  );
}

let unauthorizedHandler: (() => Promise<void> | void) | null = null;

export function setUnauthorizedHandler(
  handler: (() => Promise<void> | void) | null,
) {
  unauthorizedHandler = handler;
}

export const apiClient = axios.create({
  baseURL: baseURL,
  timeout: 30000,
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Log request
    console.log(
      `[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const isHealthOrMetrics =
      config.url?.includes("/health") || config.url?.includes("/metrics");

    if (session?.access_token && !isHealthOrMetrics) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: unknown) => {
    const shouldSkipBudgetStatus404Log =
      axios.isAxiosError(error) &&
      error.response?.status === 404 &&
      typeof error.config?.url === "string" &&
      error.config.url.includes(endpoints.budgets.currentStatus) &&
      (error.response?.data as { message?: string } | undefined)?.message ===
        "No active budget found for the current period.";

    const normalizedError = normalizeAxiosError(error);

    if (!shouldSkipBudgetStatus404Log) {
      // Log response error
      console.error(
        `[API ERROR] ${normalizedError.statusCode || "UNKNOWN"} | Message: ${normalizedError.message} | Data:`,
        normalizedError.details,
      );
    }

    if (shouldSkipBudgetStatus404Log) {
      return Promise.reject(error);
    }

    if (normalizedError.statusCode === 401 && unauthorizedHandler) {
      await unauthorizedHandler();
    }

    return Promise.reject(normalizedError);
  },
);
