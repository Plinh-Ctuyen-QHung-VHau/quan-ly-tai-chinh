import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import * as Joi from "joi";
import { configuration } from "../config/configuration";
import { AppError } from "@shared/errors/AppError";
import { ERROR_CODES } from "@shared/errors/errorCodes";
import { LlmIntentOutput } from "./dto/nlp.dto";
import { AppMetrics } from "../metrics/app.metrics";

@Injectable()
export class NlpService {
  private readonly logger = new Logger(NlpService.name);
  private readonly intentSchema = Joi.object({
    intent: Joi.string().min(1).required(),
    entities: Joi.object().required(),
  });

  constructor(
    private readonly httpService: HttpService,
    private readonly metrics: AppMetrics,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  async extractIntent(message: string, context?: string): Promise<LlmIntentOutput> {
    try {
      const sanitizedMessage = this.redactPii(message);
      const sanitizedContext = context ? this.redactPii(context) : undefined;

      const prompt = this.buildIntentPrompt(sanitizedMessage, sanitizedContext);
      const text = await this.callGemini(prompt, true);
      const parsed = this.safeParseJson(text);

      const { error, value } = this.intentSchema.validate(parsed, {
        allowUnknown: true,
      });
      if (error) {
        this.logger.warn("Invalid Gemini intent payload", error as Error);
        throw new AppError(
          "Invalid intent payload",
          ERROR_CODES.VALIDATION_ERROR,
          error.message,
        );
      }

      this.metrics.nlpRequestsTotal.inc({ status: "success" });
      return value as LlmIntentOutput;
    } catch (error) {
      this.metrics.nlpRequestsTotal.inc({ status: "error" });
      throw error;
    }
  }

  async formatReply(reply: string, data?: any): Promise<string> {
    if (!this.appConfig.gemini.formatResponse) {
      return reply;
    }

    const prompt = this.buildFormatPrompt(reply, data);
    const text = await this.callGemini(prompt, false);
    return text.trim() || reply;
  }

  private async callGemini(prompt: string, expectJson: boolean) {
    const model = this.appConfig.gemini.model;
    const apiKey = this.appConfig.gemini.apiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: any = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: expectJson ? "application/json" : "text/plain",
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          timeout: this.appConfig.gemini.timeoutMs,
        }),
      );
      const text =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return text;
    } catch (error) {
      this.logger.error("Gemini request failed", error as Error);
      throw new AppError(
        "Gemini request failed",
        ERROR_CODES.SERVICE_UNAVAILABLE,
        error,
      );
    }
  }

  private safeParseJson(raw: string) {
    const trimmed = raw.trim();
    const jsonText = this.extractJson(trimmed);
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      throw new AppError(
        "Failed to parse Gemini JSON",
        ERROR_CODES.VALIDATION_ERROR,
        error,
      );
    }
  }

  private extractJson(text: string) {
    const withoutFence = text
      .replace(/^```json/i, "")
      .replace(/```$/i, "")
      .trim();

    if (withoutFence.startsWith("{") && withoutFence.endsWith("}")) {
      return withoutFence;
    }

    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return withoutFence.slice(start, end + 1);
    }

    return withoutFence;
  }

  private buildIntentPrompt(message: string, context?: string) {
    const contextLine = context ? `Context: ${context}\n` : "";

    return (
      "You are an intent parser for a finance assistant. " +
      "Return only JSON with keys intent (string) and entities (object). " +
      "Valid intents: spending_summary, recent_anomalies, budget_status, anomaly_check, unknown. " +
      "Entities may include fromDate, toDate, category, amount. " +
      contextLine +
      `Message: ${message}`
    );
  }

  private buildFormatPrompt(reply: string, data?: any) {
    const payload = data
      ? `Data: ${this.redactPii(JSON.stringify(data))}`
      : "";
    return (
      "Rewrite the reply to be concise and friendly. Do not add new facts. " +
      payload +
      ` Reply: ${reply}`
    );
  }

  private redactPii(text: string) {
    let result = text;
    const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    const phoneRegex = /(\+?\d[\d\s-]{7,}\d)/g;
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

    result = result.replace(emailRegex, "[REDACTED_EMAIL]");
    result = result.replace(phoneRegex, "[REDACTED_PHONE]");
    result = result.replace(uuidRegex, "[REDACTED_ID]");

    // TODO: Add robust PII detection for names and addresses.
    return result;
  }
}
