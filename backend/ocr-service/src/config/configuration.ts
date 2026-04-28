import { ConfigModuleOptions, registerAs } from "@nestjs/config";
import * as Joi from "joi";

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3003),
  SUPABASE_URL: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_DB_SCHEMA: Joi.string().default("ocr"),
  SUPABASE_STORAGE_BUCKET: Joi.string().default("receipts"),
  OCR_ENGINE: Joi.string().valid("tesseract", "paddleocr", "mock").default("tesseract"),
  OCR_ENGINES: Joi.string().default("tesseract"),
  OCR_COMPARE_ENGINES: Joi.string().valid("true", "false").default("false"),
  OCR_LANG: Joi.string().default("vie+eng"),
  OCR_TIMEOUT_MS: Joi.number().default(60000),
  OCR_PREPROCESS_ENABLED: Joi.boolean().default(true),
  OCR_MAX_IMAGE_WIDTH: Joi.number().default(1600),
});

export const configuration = registerAs("app", () => ({
  port: parseInt(process.env.PORT, 10) || 3003,
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucketName: process.env.SUPABASE_STORAGE_BUCKET || "receipts",
    schema: process.env.SUPABASE_DB_SCHEMA || "ocr",
  },
  ocr: {
    engine: process.env.OCR_ENGINE || "tesseract",
    engines: process.env.OCR_ENGINES || "tesseract",
    compareEngines: process.env.OCR_COMPARE_ENGINES === "true",
    lang: process.env.OCR_LANG || "vie+eng",
    timeoutMs: parseInt(process.env.OCR_TIMEOUT_MS, 10) || 60000,
    preprocess: {
      enabled: process.env.OCR_PREPROCESS_ENABLED === "true",
      maxWidth: parseInt(process.env.OCR_MAX_IMAGE_WIDTH, 10) || 1600,
    },
  },
}));

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [configuration],
  validationSchema: configValidationSchema,
};
