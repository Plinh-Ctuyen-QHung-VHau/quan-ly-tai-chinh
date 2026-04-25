"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = void 0;
const errorResponse = (message, code, details) => ({
    success: false,
    message,
    error: {
        code,
        details: details || {},
    },
});
exports.errorResponse = errorResponse;
//# sourceMappingURL=errorResponse.js.map