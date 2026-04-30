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

  /**
   * Download image buffer from Supabase storage using a storage path.
   */
  async downloadImage(path: string): Promise<Buffer> {
    const storagePath = this.getPathFromUrl(path);
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .download(storagePath);

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

  /**
   * Alias for downloadImage - kept for compatibility.
   */
  async read(path: string): Promise<Buffer> {
    return this.downloadImage(path);
  }

  /**
   * Extract the storage path from a full URL or return the path as-is.
   */
  getPathFromUrl(urlOrPath: string): string {
    try {
      const url = new URL(urlOrPath);
      // Hỗ trợ cả public URL và signed URL:
      // /storage/v1/object/public/<bucket>/path
      // /storage/v1/object/sign/<bucket>/path?token=xxx
      const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)/);
      if (match) return decodeURIComponent(match[1]);
      return urlOrPath;
    } catch {
      // Not a URL, treat as path directly
      return urlOrPath;
    }
  }
}
