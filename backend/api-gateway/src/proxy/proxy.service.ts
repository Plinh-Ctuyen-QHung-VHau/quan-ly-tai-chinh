import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { Request } from "express";
import { firstValueFrom } from "rxjs";
import { AxiosRequestConfig, AxiosResponse } from "axios";

@Injectable()
export class ProxyService {
  private serviceUrls: Record<string, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.serviceUrls = {
      "/api/api/users":
        this.configService.get<string>("services.identity") + "/users",
      "/api/api/transactions":
        this.configService.get<string>("services.transaction") +
        "/transactions",
      "/api/api/categories":
        this.configService.get<string>("services.transaction") + "/categories",
      "/api/api/ocr": this.configService.get<string>("services.ocr") + "/ocr",
      "/api/api/budgets":
        this.configService.get<string>("services.budget") + "/budgets",
      "/api/api/notifications":
        this.configService.get<string>("services.budget") + "/notifications",
    };
  }

  private getTargetUrl(
    originalUrl: string,
  ): { targetUrl: string; servicePath: string } | null {
    for (const prefix in this.serviceUrls) {
      if (originalUrl.startsWith(prefix)) {
        const serviceUrl = this.serviceUrls[prefix];
        const servicePath = originalUrl.replace(prefix, "");
        return { targetUrl: `${serviceUrl}${servicePath}`, servicePath };
      }
    }
    return null;
  }

  async proxyRequest(req: Request): Promise<AxiosResponse<any> | null> {
    const { method, body, headers, query } = req;
    const user = req["user"];

    // req.path không chứa query string
    const path = req.path;

    const target = this.getTargetUrl(path);
    if (!target) {
      return null;
    }

    const { targetUrl } = target;

    console.log("[PROXY METHOD]", method);
    console.log("[PROXY PATH]", path);
    console.log("[PROXY QUERY]", query);
    console.log("[PROXY TARGET URL]", targetUrl);
    console.log("[PROXY BODY]", body);

    const config: AxiosRequestConfig = {
      method: method as any,
      url: targetUrl,
      params: query,
      data: body,
      headers: {
        "content-type": headers["content-type"] || "application/json",
        authorization: headers.authorization,
        "x-user-id": user?.user_id,
        "x-user-email": user?.email,
      },
    };

    return firstValueFrom(this.httpService.request(config));
  }
}
