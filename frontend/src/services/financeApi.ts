import { apiClient } from "./apiClient";
import { endpoints } from "./endpoints";

export const financeApi = {
  // Chatbot
  askChatbot: async (message: string, context?: string) => {
    const response = await apiClient.post(endpoints.chatbot.ask, { message, context });
    return response.data;
  },

  getChatHistory: async () => {
    const response = await apiClient.get(endpoints.chatbot.history);
    return response.data;
  },

  getChatSessionDetail: async (id: string) => {
    const response = await apiClient.get(endpoints.chatbot.historyDetail(id));
    return response.data;
  },

  // Anomalies
  getAnomalies: async () => {
    const response = await apiClient.get(endpoints.anomalies.list);
    return response.data;
  },

  getAnomalyDetail: async (transactionId: string) => {
    const response = await apiClient.get(endpoints.anomalies.detail(transactionId));
    return response.data;
  },

  recheckAnomaly: async (transactionId: string) => {
    const response = await apiClient.post(endpoints.anomalies.recheck(transactionId));
    return response.data;
  },

  // Insights
  getInsights: async () => {
    const response = await apiClient.get(endpoints.insights.summary);
    return response.data;
  },
};
