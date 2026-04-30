import { Injectable, Logger } from "@nestjs/common";
import { ChatRepository } from "./chat.repository";
import { ChatInputSecureDto, ChatResponseDto } from "./dto/chat.dto";
import { NlpService } from "../nlp/nlp.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AnomalyService } from "../anomaly/anomaly.service";
import { BudgetNotificationClient } from "../clients/budget-notification.client";
import { TransactionClient } from "../clients/transaction.client";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly nlpService: NlpService,
    private readonly analyticsService: AnalyticsService,
    private readonly anomalyService: AnomalyService,
    private readonly budgetClient: BudgetNotificationClient,
    private readonly transactionClient: TransactionClient,
  ) {}

  async chat(input: ChatInputSecureDto): Promise<ChatResponseDto> {
    const session_id = await this.resolveSessionId(input.user_id, input.context);
    await this.chatRepository.saveMessage({ session_id, sender_type: "user", content: input.message });

    // Lớp nhanh: Câu chào hỏi đơn giản
    const quickReply = this.getQuickReply(input.message);
    if (quickReply) {
      await this.chatRepository.saveMessage({ session_id, sender_type: "assistant", content: quickReply });
      return { reply: quickReply, metadata: { nlp_source: "rule", intent: "greeting" } };
    }

    const history = await this.getFormattedHistory(session_id);
    const categories = await this.transactionClient.getCategories(input.user_id);
    const result = await this.nlpService.processMessage(input.message, history, categories);

    let reply = "";
    let data = null;
    let intent = "unknown";

    if (result.type === "text") {
      reply = result.text;
    } else if (result.type === "function_call") {
      const { name, args } = result.call;
      intent = name;
      this.logger.log(`[AI] ${name}: ${JSON.stringify(args)}`);

      try {
        const execution = await this.executeFunction(input.user_id, name, args, categories);
        reply = execution.reply;
        this.logger.log(`[DATA] ${JSON.stringify(execution.data)}`); // Log ra terminal, không trả về user
      } catch (err) {
        this.logger.error(`[FAIL] ${name}: ${err.message}`);
        reply = "Xin lỗi, tôi gặp lỗi khi lấy dữ liệu.";
      }
    }

    await this.chatRepository.saveMessage({ session_id, sender_type: "assistant", content: reply });
    // Trả về intent + args để frontend biết AI hiểu đúng không
    return { reply, metadata: { nlp_source: "ai", intent, args: result.type === "function_call" ? result.call.args : undefined } };
  }

  private getQuickReply(msg: string): string | null {
    const t = msg.toLowerCase().trim();
    if (/^(hi|hello|xin chào|chào|alo|hey)$/.test(t)) return "Xin chào! Tôi là trợ lý tài chính của bạn.";
    return null;
  }

  private async executeFunction(user_id: string, name: string, args: any, categories: any[]) {
    switch (name) {
      case "get_spending_summary": {
        const summary = await this.analyticsService.getSpendingSummary(user_id, args.fromDate, args.toDate, args.type);
        if (!summary) return { reply: "Không có dữ liệu trong khoảng thời gian này.", data: null };

        const amount = args.type === "income" ? (summary.total_income || 0) : (summary.total_expense || 0);
        const label = args.type === "income" ? "thu nhập" : "chi tiêu";
        const timeStr = args.fromDate ? `từ ${args.fromDate} đến ${args.toDate || 'nay'}` : "30 ngày qua";
        return { reply: `Tổng ${label} của bạn ${timeStr} là **${amount.toLocaleString("vi-VN")}đ**.`, data: summary };
      }

      case "analyze_trends": {
        const [p1, p2] = await Promise.all([
          this.analyticsService.getSpendingSummary(user_id, args.period1?.from, args.period1?.to, args.type),
          this.analyticsService.getSpendingSummary(user_id, args.period2?.from, args.period2?.to, args.type),
        ]);
        const label = args.type === "income" ? "thu nhập" : "chi tiêu";
        const v1 = args.type === "income" ? (p1?.total_income || 0) : (p1?.total_expense || 0);
        const v2 = args.type === "income" ? (p2?.total_income || 0) : (p2?.total_expense || 0);
        const diff = Math.abs(v1 - v2);
        const compare = v1 > v2 ? "nhiều hơn" : v1 < v2 ? "ít hơn" : "bằng";
        return {
          reply: `Kỳ 1 (${args.period1?.from}→${args.period1?.to}): **${v1.toLocaleString("vi-VN")}đ**\nKỳ 2 (${args.period2?.from}→${args.period2?.to}): **${v2.toLocaleString("vi-VN")}đ**\n→ Kỳ 1 ${label} ${compare} kỳ 2 **${diff.toLocaleString("vi-VN")}đ**.`,
          data: { period1: p1, period2: p2 }
        };
      }

      case "record_transaction": {
        const category = categories.find(c => c.name === args.category_name && c.type === args.type)
          || categories.find(c => c.name === args.category_name)
          || categories.find(c => c.type === args.type && (c.name.includes("Khác") || c.name.includes("khác")));

        if (!category) {
          return { reply: `Không tìm thấy danh mục phù hợp. Vui lòng thử lại với danh mục khác.`, data: null };
        }

        const tx = await this.transactionClient.createTransaction(user_id, {
          type: args.type, amount: args.amount, category_id: category.id,
          transaction_date: new Date().toISOString(), source: "chatbot",
          note: args.note || args.category_name
        });
        const label = args.type === "income" ? "Thu nhập" : "Chi tiêu";
        return { reply: `✅ ${label} **${args.amount.toLocaleString("vi-VN")}đ** (${category.name}) đã được ghi lại.`, data: tx };
      }

      default:
        throw new Error(`Unsupported: ${name}`);
    }
  }

  private async getFormattedHistory(session_id: string) {
    const messages = await this.chatRepository.getSessionMessages(session_id);
    return messages.slice(-5).map(m => ({
      role: m.sender_type === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
  }

  private async resolveSessionId(user_id: string, context?: string) {
    // Ưu tiên session_id từ context (frontend truyền vào)
    const sessionId = context?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (sessionId && await this.chatRepository.getSession(sessionId)) return sessionId;
    
    // Nếu không có, lấy session mới nhất của user (không tạo mới)
    const latest = await this.chatRepository.getLatestSession(user_id);
    if (latest) return latest.id;

    // Chỉ tạo mới nếu user chưa có session nào
    const session = await this.chatRepository.createSession(user_id, "Finance Chat");
    return session.id;
  }

  async getHistory(user_id: string) { return this.chatRepository.getUserSessions(user_id); }
  async getSessionHistory(id: string) { return this.chatRepository.getSessionMessages(id); }
}
