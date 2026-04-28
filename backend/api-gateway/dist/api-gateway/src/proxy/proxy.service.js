"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let ProxyService = class ProxyService {
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        this.serviceUrls = {
            "/api/api/users": this.configService.get("services.identity") + "/users",
            "/api/api/transactions": this.configService.get("services.transaction") +
                "/transactions",
            "/api/api/categories": this.configService.get("services.transaction") + "/categories",
            "/api/api/ocr": this.configService.get("services.ocr") + "/ocr",
            "/api/api/budgets": this.configService.get("services.budget") + "/budgets",
            "/api/api/notifications": this.configService.get("services.budget") + "/notifications",
        };
    }
    getTargetUrl(originalUrl) {
        for (const prefix in this.serviceUrls) {
            if (originalUrl.startsWith(prefix)) {
                const serviceUrl = this.serviceUrls[prefix];
                const servicePath = originalUrl.replace(prefix, "");
                return { targetUrl: `${serviceUrl}${servicePath}`, servicePath };
            }
        }
        return null;
    }
    async proxyRequest(req) {
        const { method, body, headers, originalUrl } = req;
        const user = req["user"];
        const { targetUrl } = this.getTargetUrl(originalUrl);
        if (!targetUrl) {
            return null;
        }
        const config = {
            method: method,
            url: targetUrl,
            data: body,
            headers: {
                "Content-Type": headers["content-type"] || "application/json",
                "x-user-id": user?.user_id,
                "x-user-email": user?.email,
            },
        };
        return (0, rxjs_1.firstValueFrom)(this.httpService.request(config));
    }
};
exports.ProxyService = ProxyService;
exports.ProxyService = ProxyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], ProxyService);
//# sourceMappingURL=proxy.service.js.map