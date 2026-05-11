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
      configService.get<string>("app.supabase.url"),
      configService.get<string>("app.supabase.serviceRoleKey"),
    );
    this.bucketName = configService.get<string>("app.supabase.bucketName");
  }


  async downloadImage(path: string): Promise<Buffer> {
    const storagePath = this.getPathFromUrl(path);
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .download(storagePath);

    if (error) {
      throw new AppError(
        `Lỗi không thể tải ảnh từ storage: ${error.message}`,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        { path },
      );
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return buffer;
  }


  async read(path: string): Promise<Buffer> {
    return this.downloadImage(path);
  }


  getPathFromUrl(urlOrPath: string): string {
    try {
      const url = new URL(urlOrPath);

      const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)/);
      if (match) return decodeURIComponent(match[1]);
      return urlOrPath;
    } catch {

      return urlOrPath;
    }
  }
}
