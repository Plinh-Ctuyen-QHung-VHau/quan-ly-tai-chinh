import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const userAgent = req.get("user-agent") || "";

    res.on("finish", () => {
      const { statusCode } = res;
      const contentLength = res.get("content-length");
      this.logger.log(`[Yêu cầu HTTP] ${method} ${originalUrl} | Mã: ${statusCode} | Kích thước: ${contentLength} - UserAgent: ${userAgent}`);
    });

    next();
  }
}
