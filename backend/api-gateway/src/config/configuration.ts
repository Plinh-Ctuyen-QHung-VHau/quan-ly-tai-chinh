import { ConfigModuleOptions } from "@nestjs/config";
import * as Joi from "joi";

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  IDENTITY_SERVICE_URL: Joi.string().uri().required(),
  TRANSACTION_SERVICE_URL: Joi.string().uri().required(),
  OCR_SERVICE_URL: Joi.string().uri().required(),
  BUDGET_NOTIFICATION_SERVICE_URL: Joi.string().uri().required(),
  FINANCE_INTELLIGENCE_SERVICE_URL: Joi.string().uri().required(),
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(100),
});

export const configuration = () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  services: {
    identity: process.env.IDENTITY_SERVICE_URL,
    transaction: process.env.TRANSACTION_SERVICE_URL,
    ocr: process.env.OCR_SERVICE_URL,
    budget: process.env.BUDGET_NOTIFICATION_SERVICE_URL,
    finance: process.env.FINANCE_INTELLIGENCE_SERVICE_URL,
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    limit: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
});

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [configuration],
  validationSchema: configValidationSchema,
};
