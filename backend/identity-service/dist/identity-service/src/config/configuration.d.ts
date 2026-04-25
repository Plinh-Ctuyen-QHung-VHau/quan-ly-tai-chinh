import { ConfigModuleOptions } from "@nestjs/config";
import * as Joi from "joi";
export declare const configValidationSchema: Joi.ObjectSchema<any>;
export declare const configuration: () => {
    port: number;
    database: {
        url: string;
    };
};
export declare const configModuleOptions: ConfigModuleOptions;
