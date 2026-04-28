import { ConfigModuleOptions } from "@nestjs/config";
import * as Joi from "joi";
export declare const configValidationSchema: Joi.ObjectSchema<any>;
export declare const configuration: () => {
    port: number;
    supabase: {
        url: string;
        serviceRoleKey: string;
    };
    services: {
        identity: string;
        transaction: string;
        ocr: string;
        budget: string;
    };
    rateLimit: {
        ttl: number;
        limit: number;
    };
};
export declare const configModuleOptions: ConfigModuleOptions;
