import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@shared/errors/AppError";
import { ERROR_CODES } from "@shared/errors/errorCodes";

@Injectable()
export class StorageReader {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      configService.get<string>("supabase.url"),
      configService.get<string>("supabase.serviceRoleKey"),
    );
    this.bucketName = configService.get<string>("supabase.bucketName");
  }

  async downloadImage(path: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .download(path);

    if (error) {
      throw new AppError(
        `Failed to download image from storage: ${error.message}`,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        { path },
      );
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return buffer;
  }
}
