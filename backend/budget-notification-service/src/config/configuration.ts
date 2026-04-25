import { ConfigModuleOptions, registerAs } from "@nestjs/config";
import * as Joi from "joi";

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3004),
  DATABASE_URL: Joi.string().optional(),
  TRANSACTION_SERVICE_URL: Joi.string().required(),
});

export const configuration = registerAs("app", () => ({
  port: parseInt(process.env.PORT, 10) || 3004,
  database: {
    url: process.env.DATABASE_URL,
  },
  transactionServiceUrl: process.env.TRANSACTION_SERVICE_URL,
}));

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [configuration],
  validationSchema: configValidationSchema,
};
