import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { configuration } from "../config/configuration";
import { AppMetrics } from "../metrics/app.metrics";

@Injectable()
export class NlpService {
  private readonly logger = new Logger(NlpService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly metrics: AppMetrics,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  // Build tools với category enum động từ dữ liệu thật của user
  private buildTools(categories: any[]) {
    const expenseCategories = categories.filter(c => c.type === "expense").map(c => c.name);
    const incomeCategories = categories.filter(c => c.type === "income").map(c => c.name);

    return [
      {
        name: "get_spending_summary",
        description: "Lấy tổng thu nhập hoặc chi tiêu trong khoảng thời gian, hỗ trợ lọc theo danh mục cụ thể hoặc xem các danh mục chiếm nhiều nhất.",
        parameters: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["income", "expense", "all"], description: "Thu nhập, chi tiêu, hoặc tất cả (để xem số dư)" },
            fromDate: { type: "STRING", description: "Ngày bắt đầu YYYY-MM-DD" },
            toDate: { type: "STRING", description: "Ngày kết thúc YYYY-MM-DD" },
            category_name: { type: "STRING", description: "Tên danh mục cụ thể nếu người dùng hỏi (VD: ăn uống, học tập)" },
            get_top_categories: { type: "BOOLEAN", description: "Set true nếu người dùng hỏi chi nhiều nhất cho cái gì hoặc danh mục nổi bật" },
          },
          required: ["type"]
        }
      },
      {
        name: "analyze_trends",
        description: "So sánh thu nhập hoặc chi tiêu giữa 2 khoảng thời gian.",
        parameters: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["income", "expense"] },
            period1: { type: "OBJECT", properties: { from: { type: "STRING" }, to: { type: "STRING" } }, description: "Khoảng thời gian 1" },
            period2: { type: "OBJECT", properties: { from: { type: "STRING" }, to: { type: "STRING" } }, description: "Khoảng thời gian 2" },
          },
          required: ["type", "period1", "period2"]
        }
      },
      {
        name: "record_transaction",
        description: "Ghi lại giao dịch mới khi người dùng nhắc đến một khoản tiền cụ thể.",
        parameters: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["income", "expense"] },
            amount: { type: "NUMBER", description: "Số tiền" },
            // Ép AI chỉ được chọn từ danh sách category thật
            category_name: {
              type: "STRING",
              enum: [...expenseCategories, ...incomeCategories],
              description: "Danh mục giao dịch, chỉ được chọn từ danh sách"
            },
            note: { type: "STRING", description: "Ghi chú thêm" },
          },
          required: ["type", "amount", "category_name"]
        }
      },
      {
        name: "get_anomalies",
        description: "Kiểm tra lịch sử chi tiêu bất thường CÁ NHÂN của người dùng. Chỉ dùng khi người dùng hỏi VỀ BẢN THÂN họ như: 'tôi có tiêu bất thường không', 'hôm nay tôi tiêu nhiều hơn bình thường không', 'gần đây tôi có tiêu hoang không'. KHÔNG dùng cho câu hỏi giải thích khái niệm như 'bất thường là gì', 'như thế nào là bất thường'.",
        parameters: {
          type: "OBJECT",
          properties: {
            limit: { type: "NUMBER", description: "Số lượng bất thường muốn xem, mặc định 5" },
          },
          required: []
        }
      },
      {
        name: "get_budget_status",
        description: "Lấy thông tin ngân sách hiện tại của người dùng (tổng ngân sách, đã tiêu, còn lại, phần trăm).",
        parameters: {
          type: "OBJECT",
          properties: {},
          required: []
        }
      },
      {
        name: "analyze_financial_health",
        description: "Phân tích sức khỏe tài chính và đưa ra lời khuyên (cắt giảm khoản nào, danh mục nào tăng mạnh).",
        parameters: {
          type: "OBJECT",
          properties: {},
          required: []
        }
      }
    ];
  }

  async processMessage(message: string, history: any[] = [], categories: any[] = []) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.appConfig.gemini.model}:generateContent?key=${this.appConfig.gemini.apiKey}`;
    const currentDate = new Date().toISOString().split('T')[0];
    const tools = this.buildTools(categories);

    const body = {
      contents: [
        { role: "user", parts: [{ text: `Bạn là trợ lý tài chính cá nhân. Hôm nay: ${currentDate}.

NGUYÊN TẮC BẮT BUỘC:
1. Chỉ trả lời các câu hỏi liên quan đến tài chính cá nhân (thu nhập, chi tiêu, ngân sách, tiết kiệm, giao dịch).
2. Nếu người dùng hỏi chủ đề KHÔNG liên quan tài chính, hãy lịch sự từ chối và hướng họ quay lại chủ đề tài chính.
3. CHỈ ghi giao dịch khi người dùng ĐÃ NÓI RÕ số tiền cụ thể VÀ có ý định ghi. KHÔNG được tự đề xuất số tiền hoặc hỏi dẫn dắt để ghi tiền.
4. Phân biệt rõ thu nhập và chi tiêu.` }] },
        ...history,
        { role: "user", parts: [{ text: message }] }
      ],
      tools: [{ functionDeclarations: tools }],
      generationConfig: { temperature: 0.1 }
    };

    try {
      const response = await firstValueFrom(this.httpService.post(url, body));
      const part = response.data?.candidates?.[0]?.content?.parts?.[0];
      return part?.functionCall
        ? { type: "function_call", call: part.functionCall }
        : { type: "text", text: part?.text || "Xin lỗi, tôi chưa hiểu ý bạn." };
    } catch (error: any) {
      if (error.response?.status === 429) {
        return { type: "text", text: "Hệ thống AI đang xử lý quá nhiều yêu cầu cùng lúc (Quá tải). Vui lòng đợi khoảng 1 phút rồi thử lại nhé!" };
      }
      this.logger.error("Gemini API Error", error.response?.data || error.message);
      throw error;
    }
  }

  // Chỉ dùng cho các câu hỏi dạng text, KHÔNG dùng cho data số liệu
  async generateTextReply(message: string, history: any[]) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.appConfig.gemini.model}:generateContent?key=${this.appConfig.gemini.apiKey}`;
    const body = {
      contents: [
        ...history,
        { role: "user", parts: [{ text: message }] }
      ],
      generationConfig: { temperature: 0.2 }
    };
    try {
      const response = await firstValueFrom(this.httpService.post(url, body));
      return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error: any) {
      if (error.response?.status === 429) {
        return "Hệ thống AI đang xử lý quá nhiều yêu cầu cùng lúc (Quá tải). Vui lòng đợi khoảng 1 phút rồi thử lại nhé!";
      }
      this.logger.error("Gemini API Error (Text Reply)", error.response?.data || error.message);
      throw error;
    }
  }
}
