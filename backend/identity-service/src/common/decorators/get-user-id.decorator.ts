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
      // This should not happen if the API Gateway is configured correctly
      throw new InternalServerErrorException(
        "User ID not found in request headers",
      );
    }
    return userId;
  },
);
