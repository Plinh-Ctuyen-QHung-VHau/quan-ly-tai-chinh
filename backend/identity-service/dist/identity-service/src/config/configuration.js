"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configModuleOptions = exports.configuration = exports.configValidationSchema = void 0;
const Joi = require("joi");
exports.configValidationSchema = Joi.object({
    PORT: Joi.number().default(3001),
    DATABASE_URL: Joi.string().required(),
});
const configuration = () => ({
    port: parseInt(process.env.PORT, 10) || 3001,
    database: {
        url: process.env.DATABASE_URL,
    },
});
exports.configuration = configuration;
exports.configModuleOptions = {
    isGlobal: true,
    load: [exports.configuration],
    validationSchema: exports.configValidationSchema,
};
//# sourceMappingURL=configuration.js.map