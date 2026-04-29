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

// Retry helper cho Network Error (thiết bị treo, mạng yếu)
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryRequest(error: unknown, retries = 2): Promise<any> {
  const isNetworkError =
    axios.isAxiosError(error) && !error.response && error.code !== "ERR_CANCELED";

  if (isNetworkError && retries > 0) {
    await sleep(1000);
    const config = (error as any).config;
    if (config) {
      config._retryCount = (config._retryCount || 0) + 1;
      if (config._retryCount <= 2) {
        // Use axios directly to bypass apiClient response interceptors if you want, or just let interceptor handle it via config flags
        // Actually, since we use apiClient.request, it will hit the interceptor again. 
        return await apiClient.request(config);
      }
    }
  }

  return Promise.reject(error);
}

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    console.log(
      `[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
    );

    if (config.data) {
      try {
        console.log("[API BODY]", JSON.stringify(config.data));
      } catch {
        console.log("[API BODY]", config.data);
      }
    }

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
    // Retry tự động khi Network Error (thiết bị treo, mạng yếu)
    const isNetworkError =
      axios.isAxiosError(error) && !error.response && error.code !== "ERR_CANCELED";
    
    // Ngăn chặn infinite loop: interceptor bắt lại request đã retry và gọi retry lại từ đầu.
    if (isNetworkError) {
      const config = (error as any).config;
      if (!config || !config._retryCount || config._retryCount < 2) {
        return retryRequest(error);
      }
    }

    const shouldSkipBudgetStatus404Log =
      axios.isAxiosError(error) &&
      error.response?.status === 404 &&
      typeof error.config?.url === "string" &&
      error.config.url.includes(endpoints.budgets.currentStatus) &&
      (error.response?.data as { message?: string } | undefined)?.message ===
        "No active budget found for the current period.";

    const normalizedError = normalizeAxiosError(error);

    if (!shouldSkipBudgetStatus404Log) {
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
