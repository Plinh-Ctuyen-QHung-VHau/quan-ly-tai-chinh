export const successResponse = <T>(data: T, message: string, meta?: any) => ({
  success: true,
  message,
  data,
  meta: meta || null,
});
