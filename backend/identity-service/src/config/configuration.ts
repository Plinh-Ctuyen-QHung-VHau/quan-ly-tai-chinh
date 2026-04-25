import { ConfigModuleOptions } from "@nestjs/config";
import * as Joi from "joi";

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3001),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_DB_SCHEMA: Joi.string().default("identity"),
});

export const configuration = () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  supabase: {
    url: process.env.SUPABASE_URL,
    schema: process.env.SUPABASE_DB_SCHEMA || "identity",
  },
});

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [configuration],
  validationSchema: configValidationSchema,
};
