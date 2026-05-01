import { ConfigModuleOptions } from "@nestjs/config";
import * as Joi from "joi";

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3002),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_DB_SCHEMA: Joi.string().default("transaction"),
  FINANCE_INTELLIGENCE_URL: Joi.string().uri().default("http://finance-intelligence:3006"),
});

export const configuration = () => ({
  port: parseInt(process.env.PORT, 10) || 3002,
  supabase: {
    url: process.env.SUPABASE_URL,
    schema: process.env.SUPABASE_DB_SCHEMA || "transaction",
  },
  financeIntelligenceUrl: process.env.FINANCE_INTELLIGENCE_URL || "http://finance-intelligence:3006",
});

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [configuration],
  validationSchema: configValidationSchema,
};
