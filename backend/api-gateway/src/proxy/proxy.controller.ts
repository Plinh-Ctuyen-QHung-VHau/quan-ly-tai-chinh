import { Controller, All, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { ProxyService } from "./proxy.service";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";

@Controller("/api")
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) { }

  @UseGuards(SupabaseAuthGuard)
  @All("*")
  async handleAllRequests(@Req() req: Request, @Res() res: Response) {
    try {
      const serviceResponse = await this.proxyService.proxyRequest(req);

      if (serviceResponse) {
        res.status(serviceResponse.status).json(serviceResponse.data);
      } else {
        res.status(404).json({
          success: false,
          message: "Gateway: Route not found",
          debug: {
            receivedPath: req.path,
            originalUrl: req.originalUrl,
            availablePrefixes: Object.keys(this.proxyService.getServiceUrls()),
          },
        });
      }
    } catch (error) {
      const status = error.response?.status || 500;
      const data = error.response?.data || {
        message: "An error occurred in the downstream service",
      };
      res.status(status).json({
        success: false,
        message: `Downstream Error (${status})`,
        error: data,
        debug: {
          targetUrl: error.config?.url,
          method: error.config?.method,
        }
      });
    }
  }
}
