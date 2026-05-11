import { apiClient } from "./apiClient";
import { endpoints } from "./endpoints";
import { invalidateData } from "../utils/dataInvalidation";
import { handleApiResponse } from "../utils/responseHandler";

export const financeApi = {
  askChatbot: async (message: string, context?: string) => {
    const response = await apiClient.post(endpoints.chatbot.ask, { message, context });
    
    const result = handleApiResponse<any>(response);
    
    if (result?.actionPerformed === true) {
       console.log("[financeApi] AI Action detected, invalidating data...");
       invalidateData("transactions");
       invalidateData("budget");
    }
    
    return result;
  },

  getChatHistory: async () => {
    const response = await apiClient.get(endpoints.chatbot.history);
    return response.data;
  },

  getChatSessionDetail: async (id: string) => {
    const response = await apiClient.get(endpoints.chatbot.historyDetail(id));
    return response.data;
  },

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
    invalidateData("transactions");
    return response.data;
  },

  getInsights: async () => {
    const response = await apiClient.get(endpoints.insights.summary);
    return response.data;
  },
};
