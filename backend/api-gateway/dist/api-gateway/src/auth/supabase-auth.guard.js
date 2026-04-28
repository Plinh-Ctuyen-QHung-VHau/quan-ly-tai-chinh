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
exports.SupabaseAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const errorCodes_1 = require("../../../shared/errors/errorCodes");
let SupabaseAuthGuard = class SupabaseAuthGuard {
    constructor(configService) {
        this.configService = configService;
        const supabaseUrl = this.configService.get("supabase.url");
        const supabaseKey = this.configService.get("supabase.serviceRoleKey");
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new common_1.UnauthorizedException({
                message: "Authorization token not found",
                code: errorCodes_1.ERROR_CODES.UNAUTHORIZED,
            });
        }
        try {
            const { data: { user }, error, } = await this.supabase.auth.getUser(token);
            if (error || !user) {
                throw new common_1.UnauthorizedException({
                    message: "JWT Error: " + (error?.message || "Invalid or expired token"),
                    code: errorCodes_1.ERROR_CODES.UNAUTHORIZED,
                });
            }
            request["user"] = {
                user_id: user.id,
                email: user.email,
                roles: user.app_metadata?.roles || [],
            };
            request["user_id"] = user.id;
            return true;
        }
        catch (err) {
            console.error("Supabase Auth verification failed:", err);
            throw new common_1.UnauthorizedException({
                message: "JWT Error: " + (err.message || "Unknown error"),
                code: errorCodes_1.ERROR_CODES.UNAUTHORIZED,
            });
        }
    }
    extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : undefined;
    }
};
exports.SupabaseAuthGuard = SupabaseAuthGuard;
exports.SupabaseAuthGuard = SupabaseAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SupabaseAuthGuard);
//# sourceMappingURL=supabase-auth.guard.js.map