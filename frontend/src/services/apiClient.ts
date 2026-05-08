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
let isLoggingOut = false;

export function setUnauthorizedHandler(
  handler: (() => Promise<void> | void) | null,
) {
  unauthorizedHandler = handler;
}

export function setLoggingOut(value: boolean) {
  isLoggingOut = value;
  // Auto-reset after 3s to avoid getting stuck in logout state
  if (value) setTimeout(() => { isLoggingOut = false; }, 3000);
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

    config.headers["Bypass-Tunnel-Reminder"] = "true";
    config.headers["ngrok-skip-browser-warning"] = "69420";

    return config;
  },
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Kiểm tra xem đây có phải là lỗi 404 của Budget bọc trong response thành công không
    const data = response.data;
    if (data && typeof data === "object" && data.success === false) {
      const nestedStatus = data.error?.details?.statusCode;
      const isBudgetStatus404 =
        nestedStatus === 404 &&
        response.config.url?.includes(endpoints.budgets.currentStatus);

      if (isBudgetStatus404) {
        // Trả về response lỗi để handleApiResponse có thể xử lý, 
        // nhưng không in log console.error ở đây.
        return response;
      }
    }
    return response;
  },
  async (error: unknown) => {
    // Retry tự động khi Network Error
    const isNetworkError =
      axios.isAxiosError(error) && !error.response && error.code !== "ERR_CANCELED";

    if (isNetworkError) {
      const config = (error as any).config;
      if (!config || !config._retryCount || config._retryCount < 2) {
        return retryRequest(error);
      }
    }

    const normalizedError = normalizeAxiosError(error);

    // Xác định xem có nên bỏ qua log lỗi này không
    const isBudgetStatus404 =
      normalizedError.statusCode === 404 &&
      axios.isAxiosError(error) &&
      error.config?.url?.includes(endpoints.budgets.currentStatus);

    const isTransactionDetail404 =
      normalizedError.statusCode === 404 &&
      axios.isAxiosError(error) &&
      error.config?.url?.includes("/api/transactions/") &&
      error.config?.method?.toLowerCase() === "get";

    // Bỏ qua hoàn toàn lỗi 401 khi user đang đăng xuất chủ động
    const is401DuringLogout = normalizedError.statusCode === 401 && isLoggingOut;

    if (!isBudgetStatus404 && !isTransactionDetail404 && !is401DuringLogout) {
      console.error(
        `[API ERROR] ${normalizedError.statusCode || "UNKNOWN"} | Message: ${normalizedError.message} | Data:`,
        normalizedError.details,
      );
    }

    if (normalizedError.statusCode === 401 && unauthorizedHandler && !isLoggingOut) {
      await unauthorizedHandler();
    }

    return Promise.reject(normalizedError);
  },
);

const inFlightRequests = new Map<string, Promise<any>>();

const originalGet = apiClient.get;
apiClient.get = async function (url: string, config?: any) {
  const key = `GET:${url}:${JSON.stringify(config?.params || {})}`;
  if (inFlightRequests.has(key)) {
    console.log(`[API DEDUPE] Skipping duplicate request for ${key}`);
    return inFlightRequests.get(key);
  }
  const promise = originalGet.call(this, url, config).finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
};
