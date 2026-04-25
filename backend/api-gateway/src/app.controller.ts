import { Controller, All, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import * as jwt from "jsonwebtoken";
import { AppError } from "../../shared/errors/AppError";
import { ERROR_CODES } from "../../shared/errors/errorCodes";

@Controller()
export class AppController {
  private proxy = {
    "/api/users": createProxyMiddleware({
      target: process.env.IDENTITY_SERVICE_URL,
      changeOrigin: true,
    }),
    "/api/transactions": createProxyMiddleware({
      target: process.env.TRANSACTION_SERVICE_URL,
      changeOrigin: true,
    }),
    "/api/categories": createProxyMiddleware({
      target: process.env.TRANSACTION_SERVICE_URL,
      changeOrigin: true,
    }),
    "/api/ocr": createProxyMiddleware({
      target: process.env.OCR_SERVICE_URL,
      changeOrigin: true,
    }),
    "/api/budgets": createProxyMiddleware({
      target: process.env.BUDGET_NOTIFICATION_SERVICE_URL,
      changeOrigin: true,
    }),
    "/api/notifications": createProxyMiddleware({
      target: process.env.BUDGET_NOTIFICATION_SERVICE_URL,
      changeOrigin: true,
    }),
  };

  private getProxy(path: string) {
    for (const context in this.proxy) {
      if (path.startsWith(context)) {
        return this.proxy[context];
      }
    }
    return null;
  }

  @All("/api/*")
  async proxyRequest(@Req() req: Request, @Res() res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Unauthorized", ERROR_CODES.UNAUTHORIZED);
    }
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
      const userId = decoded.sub;
      req.headers["x-user-id"] = userId;
    } catch (error) {
      throw new AppError("Invalid token", ERROR_CODES.UNAUTHORIZED);
    }

    const proxyMiddleware = this.getProxy(req.originalUrl);
    if (proxyMiddleware) {
      return proxyMiddleware(req, res, () => {});
    }

    res.status(404).json({ message: "Not Found" });
  }
}
