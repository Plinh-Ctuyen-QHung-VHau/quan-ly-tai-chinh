"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = void 0;
const successResponse = (data, message, meta) => ({
    success: true,
    message,
    data,
    meta: meta || null,
});
exports.successResponse = successResponse;
//# sourceMappingURL=successResponse.js.map