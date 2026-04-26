export const endpoints = {
  health: "/api/health",
  metrics: "/api/metrics",

  users: {
    me: "/api/api/users/me",
    settings: "/api/api/users/settings",
  },

  categories: {
    list: "/api/api/categories",
  },

  transactions: {
    create: "/api/api/transactions",
    list: "/api/api/transactions",
    summary: "/api/api/transactions/summary",
    history: "/api/api/transactions/history",
    detail: (id: string) => `/api/api/transactions/${id}`,
    update: (id: string) => `/api/api/transactions/${id}`,
    remove: (id: string) => `/api/api/transactions/${id}`,
  },

  ocr: {
    scan: "/api/api/ocr/scan",
    result: (id: string) => `/api/api/ocr/result/${id}`,
    retry: (id: string) => `/api/api/ocr/retry/${id}`,
  },

  budgets: {
    create: "/api/api/budgets",
    current: "/api/api/budgets/current",
    currentStatus: "/api/api/budgets/current/status",
    update: (id: string) => `/api/api/budgets/${id}`,
    remove: (id: string) => `/api/api/budgets/${id}`,
  },

  notifications: {
    list: "/api/api/notifications",
    settings: "/api/api/notifications/settings",
    updateSettings: "/api/api/notifications/settings",
    readAll: "/api/api/notifications/read-all",
    detail: (id: string) => `/api/api/notifications/${id}`,
    markRead: (id: string) => `/api/api/notifications/${id}/read`,
  },
};
