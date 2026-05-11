import axios, { AxiosError, AxiosResponse } from "axios";

import { ApiErrorPayload, ApiResponse } from "../types/api";

export class ApiError extends Error {
  code?: string;
  details?: unknown;
  statusCode?: number;

  constructor(
    message: string,
    options?: { code?: string; details?: unknown; statusCode?: number },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code;
    this.details = options?.details;
    this.statusCode = options?.statusCode;
  }
}

export function unwrapApiResponse<T>(
  payload: ApiResponse<T> | ApiErrorPayload,
): T {
  if (!payload.success) {
    const errorPayload = payload as ApiErrorPayload;
    const nestedStatusCode = (errorPayload.error?.details as any)?.statusCode;

    throw new ApiError(payload.message, {
      code: errorPayload.error?.code,
      details: errorPayload.error?.details,
      statusCode: nestedStatusCode,
    });
  }

  return payload.data as T;
}

export function handleApiResponse<T>(
  response: AxiosResponse<ApiResponse<T> | ApiErrorPayload>,
): T {
  return unwrapApiResponse(response.data);
}

export function normalizeAxiosError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    return normalizeAxiosResponseError(error);
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError("Đã xảy ra lỗi không xác định.");
}

function normalizeAxiosResponseError(error: AxiosError<unknown>): ApiError {
  const statusCode = error.response?.status;
  const responseData = error.response?.data as ApiErrorPayload | undefined;

  if (
    responseData &&
    typeof responseData === "object" &&
    "success" in responseData &&
    responseData.success === false
  ) {
    return new ApiError(responseData.message || "Yêu cầu không thành công.", {
      code: responseData.error?.code,
      details: responseData.error?.details,
      statusCode,
    });
  }

  if (statusCode === 401) {
    return new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", {
      code: "UNAUTHORIZED",
      statusCode,
    });
  }

  if (statusCode === 403) {
    return new ApiError("Bạn không có quyền thực hiện thao tác này.", {
      code: "FORBIDDEN",
      statusCode,
    });
  }

  if (statusCode === 404) {
    return new ApiError("Không tìm thấy dữ liệu yêu cầu.", {
      code: "NOT_FOUND",
      statusCode,
    });
  }

  if (error.message) {
    return new ApiError(error.message, { statusCode });
  }

  return new ApiError("Không thể kết nối đến máy chủ.", { statusCode });
}
