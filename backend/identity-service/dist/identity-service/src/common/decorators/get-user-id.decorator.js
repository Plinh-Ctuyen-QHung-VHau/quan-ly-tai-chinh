"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Getuser_id = void 0;
const common_1 = require("@nestjs/common");
exports.Getuser_id = (0, common_1.createParamDecorator)((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const user_id = request.headers["x-user-id"];
  if (!user_id) {
    throw new common_1.InternalServerErrorException(
      "User ID not found in request headers",
    );
  }
  return user_id;
});
//# sourceMappingURL=get-user-id.decorator.js.map
