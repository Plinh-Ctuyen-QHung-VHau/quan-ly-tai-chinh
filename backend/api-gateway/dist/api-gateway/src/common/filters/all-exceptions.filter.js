"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const errorResponse_1 = require("../../../../shared/response/errorResponse");
const errorCodes_1 = require("../../../../shared/errors/errorCodes");
const AppError_1 = require("../../../../shared/errors/AppError");
let AllExceptionsFilter = class AllExceptionsFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = "An unexpected error occurred";
        let code = errorCodes_1.ERROR_CODES.INTERNAL_SERVER_ERROR;
        let details;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const error = exception.getResponse();
            message = error.message || exception.message;
            code = error.code || code;
            details = error.details || error;
        }
        else if (exception instanceof AppError_1.AppError) {
            status = this.mapCodeToStatus(exception.code);
            message = exception.message;
            code = exception.code;
            details = exception.details;
        }
        else if (exception instanceof Error) {
            message = exception.message;
        }
        response.status(status).json((0, errorResponse_1.errorResponse)(message, code, details));
    }
    mapCodeToStatus(code) {
        switch (code) {
            case errorCodes_1.ERROR_CODES.VALIDATION_ERROR:
                return common_1.HttpStatus.BAD_REQUEST;
            case errorCodes_1.ERROR_CODES.UNAUTHORIZED:
                return common_1.HttpStatus.UNAUTHORIZED;
            case errorCodes_1.ERROR_CODES.FORBIDDEN:
                return common_1.HttpStatus.FORBIDDEN;
            case errorCodes_1.ERROR_CODES.NOT_FOUND:
                return common_1.HttpStatus.NOT_FOUND;
            case errorCodes_1.ERROR_CODES.CONFLICT:
                return common_1.HttpStatus.CONFLICT;
            case errorCodes_1.ERROR_CODES.RATE_LIMIT_EXCEEDED:
                return common_1.HttpStatus.TOO_MANY_REQUESTS;
            default:
                return common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        }
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map