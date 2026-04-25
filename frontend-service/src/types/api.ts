export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: PaginatedMeta | null;
}

export interface ApiErrorDetails {
  code?: string;
  details?: Record<string, unknown> | unknown;
}

export interface ApiErrorPayload {
  success: false;
  message: string;
  error?: ApiErrorDetails;
}
