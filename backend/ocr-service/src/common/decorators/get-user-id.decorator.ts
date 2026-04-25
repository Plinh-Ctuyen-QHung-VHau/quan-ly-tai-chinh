import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from "@nestjs/common";

export const GetUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const userId = request.headers["x-user-id"];
    if (!userId) {
      throw new InternalServerErrorException(
        "User ID not found in request headers",
      );
    }
    return userId;
  },
);
