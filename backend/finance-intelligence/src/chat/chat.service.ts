import { Injectable } from "@nestjs/common";
import { ChatRepository } from "./chat.repository";
import { ChatInputDto, ChatResponseDto } from "./dto/chat.dto";
import { NlpService } from "../nlp/nlp.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AnomalyService } from "../anomaly/anomaly.service";
import { BudgetNotificationClient } from "../clients/budget-notification.client";
import { ApiGatewayClient } from "../clients/api-gateway.client";
import { AppMetrics } from "../metrics/app.metrics";

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly nlpService: NlpService,
    private readonly analyticsService: AnalyticsService,
    private readonly anomalyService: AnomalyService,
    private readonly budgetClient: BudgetNotificationClient,
    private readonly apiGatewayClient: ApiGatewayClient,
    private readonly metrics: AppMetrics,
  ) {}

  async chat(input: ChatInputDto): Promise<ChatResponseDto> {
    const session_id = await this.resolveSessionId(input.user_id, input.context);

    await this.chatRepository.saveMessage({
      session_id,
      sender_type: "user",
      content: input.message,
    });

    const intentResult = await this.nlpService.extractIntent(
      input.message,
      input.context,
    );

    const response = await this.handleIntent(
      input.user_id,
      intentResult.intent,
      intentResult.entities,
    );

    const formattedReply = await this.nlpService.formatReply(
      response.reply,
      response.data,
    );

    await this.chatRepository.saveMessage({
      session_id,
      sender_type: "assistant",
      content: formattedReply,
      intent: intentResult.intent,
      entities_json: intentResult.entities,
    });

    this.metrics.chatRequestsTotal.inc({ intent: intentResult.intent || "unknown" });
    await this.apiGatewayClient.notifyChatHandled(input.user_id, session_id);

    return { reply: formattedReply, data: response.data };
  }

  private async handleIntent(
    user_id: string,
    intent: string,
    entities: Record<string, any>,
  ): Promise<ChatResponseDto> {
    switch (intent) {
      case "spending_summary": {
        const summary = await this.analyticsService.getSpendingSummary(
          user_id,
          entities?.fromDate,
          entities?.toDate,
        );
        return {
          reply: "Here is your spending summary.",
          data: summary,
        };
      }
      case "recent_anomalies": {
        const anomalies = await this.anomalyService.getRecentAnomalies(user_id, 5);
        return {
          reply: anomalies.length
            ? "Here are your most recent anomalies."
            : "No anomalies were detected recently.",
          data: anomalies,
        };
      }
      case "budget_status": {
        const status = await this.budgetClient.getCurrentStatus(user_id);
        return {
          reply: "Here is your current budget status.",
          data: status,
        };
      }
      case "anomaly_check": {
        const anomalies = await this.anomalyService.getRecentAnomalies(user_id, 3);
        return {
          reply: "Anomaly checks run on new transactions. Here is a recent snapshot.",
          data: anomalies,
        };
      }
      default:
        return {
          reply:
            "I can help with spending summaries, budget status, or recent anomalies.",
        };
    }
  }

  private async resolveSessionId(user_id: string, context?: string) {
    const sessionId = this.extractSessionId(context);
    if (sessionId) {
      const existing = await this.chatRepository.getSession(sessionId);
      if (existing) {
        return sessionId;
      }
    }

    const title = this.buildSessionTitle(context);
    const session = await this.chatRepository.createSession(user_id, title);
    return session.id;
  }

  private extractSessionId(context?: string) {
    if (!context) return null;
    const uuidRegex =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = context.match(uuidRegex);
    return match ? match[0] : null;
  }

  private buildSessionTitle(context?: string) {
    if (!context) return "Finance chat";
    return context.slice(0, 50);
  }
}
