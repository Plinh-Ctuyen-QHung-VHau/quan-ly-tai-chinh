export const errorResponse = (
  message: string,
  code: string,
  details?: any,
) => ({
  success: false,
  message,
  error: {
    code,
    details: details || {},
  },
});
