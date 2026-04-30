import { ConfigModuleOptions, registerAs } from "@nestjs/config";
import * as Joi from "joi";

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3006),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_DB_SCHEMA: Joi.string().default("finance"),
  EVENT_LOG_SCHEMA: Joi.string().default("app_common"),
  PROCESSED_EVENTS_SCHEMA: Joi.string().default("app_common"),
  GEMINI_API_KEY: Joi.string().required(),
  GEMINI_MODEL: Joi.string().default("gemini-3-flash-preview"),
  GEMINI_TIMEOUT_MS: Joi.number().default(30000),
  API_GATEWAY_URL: Joi.string().required(),
  TRANSACTION_SERVICE_URL: Joi.string().required(),
  BUDGET_NOTIFICATION_SERVICE_URL: Joi.string().required(),
  MESSAGE_BROKER_URL: Joi.string().allow("").optional(),
  ANOMALY_AMOUNT_THRESHOLD: Joi.number().default(5000000),
  DAILY_SPIKE_MULTIPLIER: Joi.number().default(2.5),
  FREQUENCY_MULTIPLIER: Joi.number().default(2),
  CONSUMER_NAME: Joi.string().default("finance-intelligence-service"),
});

export const configuration = registerAs("app", () => ({
  port: parseInt(process.env.PORT, 10) || 3006,
  supabase: {
    url: process.env.SUPABASE_URL,
    schema: process.env.SUPABASE_DB_SCHEMA || "finance",
  },
  eventLogSchema: process.env.EVENT_LOG_SCHEMA || "app_common",
  processedEventsSchema: process.env.PROCESSED_EVENTS_SCHEMA || "app_common",
  // TODO: Move GEMINI_API_KEY to secret manager or infrastructure vault.
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 30000,
  },
  apiGatewayUrl: process.env.API_GATEWAY_URL,
  transactionServiceUrl: process.env.TRANSACTION_SERVICE_URL,
  budgetNotificationServiceUrl: process.env.BUDGET_NOTIFICATION_SERVICE_URL,
  messageBrokerUrl: process.env.MESSAGE_BROKER_URL,
  anomaly: {
    amountThreshold: Number(process.env.ANOMALY_AMOUNT_THRESHOLD) || 5000000,
    dailySpikeMultiplier: Number(process.env.DAILY_SPIKE_MULTIPLIER) || 2.5,
    frequencyMultiplier: Number(process.env.FREQUENCY_MULTIPLIER) || 2,
  },
  consumerName: process.env.CONSUMER_NAME || "finance-intelligence-service",
}));

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [configuration],
  validationSchema: configValidationSchema,
};
