import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ERROR_CODES } from "@shared/errors/errorCodes";

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>("supabase.url");
    const supabaseKey = this.configService.get<string>(
      "supabase.serviceRoleKey",
    );
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

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
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException({
          message:
            "JWT Error: " + (error?.message || "Invalid or expired token"),
          code: ERROR_CODES.UNAUTHORIZED,
        });
      }

      request["user"] = {
        user_id: user.id,
        email: user.email,
        roles: user.app_metadata?.roles || [],
      };

      request["user_id"] = user.id;

      return true;
    } catch (err: any) {
      console.error("Supabase Auth verification failed:", err);
      throw new UnauthorizedException({
        message: "JWT Error: " + (err.message || "Unknown error"),
        code: ERROR_CODES.UNAUTHORIZED,
      });
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
