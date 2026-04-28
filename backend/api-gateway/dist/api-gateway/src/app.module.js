"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const axios_1 = require("@nestjs/axios");
const health_controller_1 = require("./health/health.controller");
const metrics_controller_1 = require("./metrics/metrics.controller");
const proxy_controller_1 = require("./proxy/proxy.controller");
const proxy_service_1 = require("./proxy/proxy.service");
const configuration_1 = require("./config/configuration");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot(configuration_1.configModuleOptions),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => [
                    {
                        ttl: config.get("rateLimit.ttl"),
                        limit: config.get("rateLimit.limit"),
                    },
                ],
            }),
            axios_1.HttpModule,
        ],
        controllers: [health_controller_1.HealthController, metrics_controller_1.MetricsController, proxy_controller_1.ProxyController],
        providers: [proxy_service_1.ProxyService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map