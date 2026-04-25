import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { ERROR_CODES } from "../../../shared/errors/errorCodes";

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException({
        message: "Authorization token not found",
        code: ERROR_CODES.UNAUTHORIZED,
      });
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("supabase.jwtSecret"),
      });
      // Attach user info to the request object
      request["user"] = {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
      };
    } catch {
      throw new UnauthorizedException({
        message: "Invalid or expired token",
        code: ERROR_CODES.UNAUTHORIZED,
      });
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
