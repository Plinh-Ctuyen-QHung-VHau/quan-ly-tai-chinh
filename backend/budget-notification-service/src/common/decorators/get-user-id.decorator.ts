import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from "@nestjs/common";

export const Getuser_id = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user_id = request.headers["x-user-id"];
    if (!user_id) {
      throw new InternalServerErrorException(
        "User ID not found in request headers",
      );
    }
    return user_id;
  },
);
