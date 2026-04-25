"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = exports.PG_CONNECTION = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const config_1 = require("@nestjs/config");
exports.PG_CONNECTION = "PG_CONNECTION";
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        providers: [
            {
                provide: exports.PG_CONNECTION,
                inject: [config_1.ConfigService],
                useFactory: async (configService) => {
                    const pool = new pg_1.Pool({
                        connectionString: configService.get("database.url"),
                    });
                    await pool.query("SELECT NOW()");
                    return pool;
                },
            },
        ],
        exports: [exports.PG_CONNECTION],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map