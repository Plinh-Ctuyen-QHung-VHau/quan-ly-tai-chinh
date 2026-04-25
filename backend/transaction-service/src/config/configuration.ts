import { ConfigModuleOptions } from '@nestjs/config';
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3002),
  DATABASE_URL: Joi.string().required(),
});

export const configuration = () => ({
  port: parseInt(process.env.PORT, 10) || 3002,
  database: {
    url: process.env.DATABASE_URL,
  },
});

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [configuration],
  validationSchema: configValidationSchema,
};
