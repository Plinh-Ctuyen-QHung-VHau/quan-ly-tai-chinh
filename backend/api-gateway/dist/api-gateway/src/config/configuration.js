"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configModuleOptions = exports.configuration = exports.configValidationSchema = void 0;
const Joi = require("joi");
exports.configValidationSchema = Joi.object({
    PORT: Joi.number().default(3000),
    SUPABASE_URL: Joi.string().uri().required(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
    IDENTITY_SERVICE_URL: Joi.string().uri().required(),
    TRANSACTION_SERVICE_URL: Joi.string().uri().required(),
    OCR_SERVICE_URL: Joi.string().uri().required(),
    BUDGET_NOTIFICATION_SERVICE_URL: Joi.string().uri().required(),
    RATE_LIMIT_TTL: Joi.number().default(60),
    RATE_LIMIT_MAX: Joi.number().default(100),
});
const configuration = () => ({
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
    },
    rateLimit: {
        ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
        limit: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    },
});
exports.configuration = configuration;
exports.configModuleOptions = {
    isGlobal: true,
    load: [exports.configuration],
    validationSchema: exports.configValidationSchema,
};
//# sourceMappingURL=configuration.js.map