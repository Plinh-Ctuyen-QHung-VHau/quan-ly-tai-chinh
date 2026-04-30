export const endpoints = {
  health: "/api/health",
  metrics: "/api/metrics",

  users: {
    me: "/api/users/me",
    settings: "/api/users/settings",
  },

  categories: {
    list: (type: "income" | "expense") => `/api/categories?type=${type}`,
  },

  transactions: {
    create: "/api/transactions",
    list: "/api/transactions",
    summary: "/api/transactions/summary",
    history: "/api/transactions/history",
    detail: (id: string) => `/api/transactions/${id}`,
    update: (id: string) => `/api/transactions/${id}`,
    remove: (id: string) => `/api/transactions/${id}`,
  },

  ocr: {
    scan: "/api/ocr/scan",
    result: (id: string) => `/api/ocr/result/${id}`,
    retry: (id: string) => `/api/ocr/retry/${id}`,
  },

  budgets: {
    create: "/api/budgets",
    current: "/api/budgets/current",
    currentStatus: "/api/budgets/current/status",
    update: (id: string) => `/api/budgets/${id}`,
    remove: (id: string) => `/api/budgets/${id}`,
  },

  notifications: {
    list: "/api/notifications",
    settings: "/api/notifications/settings",
    updateSettings: "/api/notifications/settings",
    readAll: "/api/notifications/read-all",
    detail: (id: string) => `/api/notifications/${id}`,
    markRead: (id: string) => `/api/notifications/${id}/read`,
  },

  chatbot: {
    ask: "/api/chatbot/ask",
    history: "/api/chatbot/history",
    historyDetail: (id: string) => `/api/chatbot/history/${id}`,
  },

  anomalies: {
    list: "/api/anomalies",
    detail: (transactionId: string) => `/api/anomalies/${transactionId}`,
    recheck: (transactionId: string) => `/api/anomalies/recheck/${transactionId}`,
  },

  insights: {
    summary: "/api/insights",
  },
};
