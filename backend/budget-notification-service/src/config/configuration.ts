import { ConfigModuleOptions, registerAs } from "@nestjs/config";
import * as Joi from "joi";

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3004),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_DB_SCHEMA: Joi.string().default("budget"),
  TRANSACTION_SERVICE_URL: Joi.string().required(),
  EVENT_LOG_SCHEMA: Joi.string().default("app_common"),
  BUDGET_ALERT_THRESHOLD: Joi.number().default(80),
  BUDGET_EXCEEDED_THRESHOLD: Joi.number().default(100),
});

export const configuration = registerAs("app", () => ({
  port: parseInt(process.env.PORT, 10) || 3004,
  supabase: {
    url: process.env.SUPABASE_URL,
    schema: process.env.SUPABASE_DB_SCHEMA || "budget",
  },
  transactionServiceUrl: process.env.TRANSACTION_SERVICE_URL,
  eventLogSchema: process.env.EVENT_LOG_SCHEMA || "app_common",
  budgetAlertThreshold: parseInt(process.env.BUDGET_ALERT_THRESHOLD, 10) || 80,
  budgetExceededThreshold:
    parseInt(process.env.BUDGET_EXCEEDED_THRESHOLD, 10) || 100,
}));

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [configuration],
  validationSchema: configValidationSchema,
};
