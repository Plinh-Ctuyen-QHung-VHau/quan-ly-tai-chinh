import { Injectable, Logger } from "@nestjs/common";
import { ChatRepository } from "./chat.repository";
import { ChatInputSecureDto, ChatResponseDto } from "./dto/chat.dto";
import { NlpService } from "../nlp/nlp.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AnomalyService } from "../anomaly/anomaly.service";
import { BudgetNotificationClient } from "../clients/budget-notification.client";
import { TransactionClient } from "../clients/transaction.client";
import { EventPublisher } from "@shared/events/event.publisher";

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
    private readonly eventPublisher: EventPublisher,
  ) { }

  async chat(input: ChatInputSecureDto): Promise<ChatResponseDto> {
    const session_id = await this.resolveSessionId(input.user_id, input.context);
    await this.chatRepository.saveMessage({ session_id, sender_type: "user", content: input.message });


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
    let actionPerformed = false;

    if (result.type === "text") {
      reply = result.text;
    } else if (result.type === "function_call") {
      const { name, args } = result.call;
      intent = name;
      this.logger.log(`[Chatbot Gọi Hàm] ${name}: ${JSON.stringify(args)}`);

      try {
        const execution = await this.executeFunction(input.user_id, name, args, categories);
        reply = execution.reply;
        actionPerformed = !!execution.actionPerformed;
        this.logger.log(`[Dữ liệu trả về] ${JSON.stringify(execution.data)}`);
      } catch (err) {
        this.logger.error(`[Lỗi Chatbot] ${name}: ${err.message}`);
        reply = "Xin lỗi, tôi gặp lỗi khi lấy dữ liệu.";
      }
    }

    await this.chatRepository.saveMessage({ session_id, sender_type: "assistant", content: reply });


    this.eventPublisher.publish("chatbot.interaction", {
      user_id: input.user_id,
      session_id,
      question: input.message,
      answer: reply,
      intent,
      args: result.type === "function_call" ? result.call.args : undefined,
    }, "finance-intelligence").catch(err => console.error(err));

    return {
      reply,
      metadata: { nlp_source: "ai", intent, args: result.type === "function_call" ? result.call.args : undefined },
      actionPerformed
    };
  }

  private getQuickReply(msg: string): string | null {
    const t = msg.toLowerCase().trim();
    if (/^(hi|hello|xin chào|chào|alo|hey)$/.test(t)) return "Xin chào! Tôi là trợ lý tài chính của bạn.";
    return null;
  }

  private async executeFunction(user_id: string, name: string, args: any, categories: any[]) {
    switch (name) {
      case "get_spending_summary": {
        const queryType = args.type === "all" ? undefined : args.type;
        const summary = await this.analyticsService.getSpendingSummary(user_id, args.fromDate, args.toDate, queryType);
        if (!summary) return { reply: "Không có dữ liệu trong khoảng thời gian này.", data: null };

        const timeStr = args.fromDate ? `từ ${args.fromDate} đến ${args.toDate || 'nay'}` : "trong thời gian này";

        if (args.type === "all") {
          return { reply: `Tổng thu nhập của bạn ${timeStr} là **${summary.total_income.toLocaleString("vi-VN")}đ** và tổng chi tiêu là **${summary.total_expense.toLocaleString("vi-VN")}đ**. Bạn còn lại **${summary.balance.toLocaleString("vi-VN")}đ**.`, data: summary };
        }

        if (args.get_top_categories && summary.category_breakdown) {
          const filtered = summary.category_breakdown.filter(c => c.type === args.type);
          if (filtered.length === 0) return { reply: "Không có khoản nào đáng chú ý.", data: summary };
          const top1 = filtered[0];
          const label = args.type === "income" ? "thu nhập" : "chi tiêu";
          return { reply: `Khoản ${label} lớn nhất của bạn ${timeStr} là **${top1.category_name}** với số tiền **${top1.amount.toLocaleString("vi-VN")}đ**.`, data: summary };
        }

        if (args.category_name && summary.category_breakdown) {
          const cat = summary.category_breakdown.find(c => c.category_name.toLowerCase().includes(args.category_name.toLowerCase()) && c.type === args.type);
          const amt = cat ? cat.amount : 0;
          return { reply: `Bạn đã chi tiêu **${amt.toLocaleString("vi-VN")}đ** cho mục **${args.category_name}** ${timeStr}.`, data: summary };
        }

        const amount = args.type === "income" ? (summary.total_income || 0) : (summary.total_expense || 0);
        const label = args.type === "income" ? "thu nhập" : "chi tiêu";
        return { reply: `Tổng ${label} của bạn ${timeStr} là **${amount.toLocaleString("vi-VN")}đ**.`, data: summary };
      }

      case "get_budget_status": {
        try {
          const status = await this.budgetClient.getCurrentStatus(user_id);
          if (!status) return { reply: "Bạn chưa thiết lập ngân sách nào cho thời gian này.", data: null };

          let advice = "";
          if (status.status === "danger") advice = "Bạn đã vượt ngân sách! Hãy ngừng chi tiêu ngay lập tức.";
          else if (status.status === "warning") advice = "Bạn sắp hết ngân sách. Hãy cẩn thận!";
          else advice = "Bạn đang chi tiêu rất an toàn trong tầm kiểm soát.";

          return {
            reply: `Ngân sách của bạn là **${status.budget_amount.toLocaleString("vi-VN")}đ**. Bạn đã dùng **${status.spent_amount.toLocaleString("vi-VN")}đ** (${status.percent_used}%). Bạn còn lại **${status.remaining_amount.toLocaleString("vi-VN")}đ**. ${advice}`,
            data: status
          };
        } catch (err) {
          return { reply: "Không thể lấy thông tin ngân sách lúc này.", data: null };
        }
      }

      case "analyze_financial_health": {
        try {
          const summary = await this.analyticsService.getSpendingSummary(user_id);
          let budget = null;
          try { budget = await this.budgetClient.getCurrentStatus(user_id); } catch (e) { }

          const prompt = `Dựa vào dữ liệu sau, hãy đưa ra 1-2 lời khuyên tài chính ngắn gọn gọn (dưới 4 câu) giúp người dùng tiết kiệm hơn:
- Tổng thu: ${summary.total_income}đ
- Tổng chi: ${summary.total_expense}đ
- Các khoản chi lớn nhất: ${JSON.stringify(summary.category_breakdown?.filter(c => c.type === 'expense').slice(0, 3) || [])}
- Tình trạng ngân sách: ${budget ? `Đã dùng ${budget.percent_used}%. Còn ${budget.remaining_amount}đ` : 'Không thiết lập'}
`;
          const reply = await this.nlpService.generateTextReply(prompt, []);
          return { reply, data: summary };
        } catch (err) {
          return { reply: "Không thể phân tích lúc này.", data: null };
        }
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
          || categories.find(c => c.type === args.type && c.name.toLowerCase() === args.category_name?.toLowerCase())
          || categories.find(c => c.type === args.type && (c.name.toLowerCase().includes("khác") || c.name.toLowerCase().includes("other")));

        if (!category) {
          return { reply: `Không tìm thấy danh mục phù hợp. Vui lòng thử lại với danh mục khác.`, data: null };
        }

        const tx = await this.transactionClient.createTransaction(user_id, {
          type: args.type, amount: args.amount, category_id: category.id,
          transaction_date: new Date().toISOString(), source: "chatbot",
          note: args.note || args.category_name
        });
        const label = args.type === "income" ? "Thu nhập" : "Chi tiêu";
        return {
          reply: `✅ ${label} **${args.amount.toLocaleString("vi-VN")}đ** (${category.name}) đã được ghi lại.`,
          data: tx,
          actionPerformed: true
        };
      }

      case "get_anomalies": {
        const limit = args.limit || 5;
        const anomalies = await this.anomalyService.getRecentAnomalies(user_id, limit, args.fromDate, args.toDate);

        if (!anomalies || anomalies.length === 0) {
          const timeStr = args.fromDate ? `từ ${args.fromDate} đến ${args.toDate || 'nay'}` : "gần đây";
          return {
            reply: `Không phát hiện chi tiêu bất thường nào ${timeStr}. Bạn đang chi tiêu khá đều đặn so với thói quen của mình 👍`,
            data: [],
          };
        }

        let history = [];
        try { history = await this.transactionClient.getHistory(user_id); } catch (e) { }

        const summary = anomalies.map(a => {
          const typeLabel = a.anomaly_type === "daily_spike" ? "Tổng chi đột biến" : "Tần suất giao dịch bất thường";
          const dateStr = a.detected_at.slice(0, 10);
          const dateObj = new Date(a.detected_at).toLocaleDateString("vi-VN");

          let detailStr = "";
          const dayHistory = history.find(d => d.date === dateStr);
          if (dayHistory && dayHistory.transactions) {
            const topTx = [...dayHistory.transactions]
              .filter(tx => tx.type === 'expense')
              .sort((x, y) => Number(y.amount) - Number(x.amount))
              .slice(0, 2);
            if (topTx.length > 0) {
              detailStr = ` (Khoản lớn nhất trong ngày: ${topTx.map(t => `${t.category_name || 'Khác'} ${Number(t.amount).toLocaleString('vi-VN')}đ`).join(', ')})`;
            }
          }

          return `- Ngày ${dateObj}: ${typeLabel} | Mức độ: ${a.severity} | Tổng chi trong ngày: ${Number(a.actual_value).toLocaleString("vi-VN")}đ (Ngưỡng bình thường: ${Number(a.threshold_value).toLocaleString("vi-VN")}đ)${detailStr}`;
        }).join("\n");

        const prompt = `Bạn là trợ lý tài chính. Dựa vào dữ liệu bất thường thực tế sau đây, hãy trả lời tự nhiên bằng tiếng Việt cho người dùng. BẮT BUỘC phải chỉ rõ ra ngày mấy, tổng chi bao nhiêu, và liệt kê các GIAO DỊCH LỚN NHẤT (bao nhiêu tiền, danh mục nào) đã gây ra sự bất thường này.\n\n${summary}\n\nKết thúc bằng 1 lời khuyên ngắn gọn.`;

        const reply = await this.nlpService.generateTextReply(prompt, []);
        return {
          reply: reply || "Phát hiện một số giao dịch bất thường gần đây. Bạn nên xem lại chi tiêu.",
          data: anomalies,
        };
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
    const sessionId = context?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (sessionId && await this.chatRepository.getSession(sessionId)) return sessionId;

    const latest = await this.chatRepository.getLatestSession(user_id);
    if (latest) return latest.id;

    const session = await this.chatRepository.createSession(user_id, "Finance Chat");
    return session.id;
  }

  async getHistory(user_id: string) { return this.chatRepository.getUserSessions(user_id); }
  async getSessionHistory(id: string) { return this.chatRepository.getSessionMessages(id); }
}
