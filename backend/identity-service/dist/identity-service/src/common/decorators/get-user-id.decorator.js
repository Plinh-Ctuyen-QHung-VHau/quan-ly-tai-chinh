"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserId = void 0;
const common_1 = require("@nestjs/common");
exports.GetUserId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const userId = request.headers["x-user-id"];
    if (!userId) {
        throw new common_1.InternalServerErrorException("User ID not found in request headers");
    }
    return userId;
});
//# sourceMappingURL=get-user-id.decorator.js.map