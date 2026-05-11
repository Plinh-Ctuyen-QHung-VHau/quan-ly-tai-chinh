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
    this.initializeServiceUrls();
  }

  public getServiceUrls() {
    return this.serviceUrls;
  }

  private initializeServiceUrls() {
    this.serviceUrls = {
      "/api/users":
        this.configService.get<string>("services.identity") + "/users",
      "/api/transactions":
        this.configService.get<string>("services.transaction") + "/transactions",
      "/api/categories":
        this.configService.get<string>("services.transaction") + "/categories",
      "/api/ocr": this.configService.get<string>("services.ocr") + "/ocr",
      "/api/budgets":
        this.configService.get<string>("services.budget") + "/budgets",
      "/api/notifications":
        this.configService.get<string>("services.budget") + "/notifications",
      "/api/chatbot":
        this.configService.get<string>("services.finance") + "/chatbot",
      "/api/anomalies":
        this.configService.get<string>("services.finance") + "/anomalies",
      "/api/insights":
        this.configService.get<string>("services.finance") + "/insights",
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

    const path = req.originalUrl.split("?")[0];

    const target = this.getTargetUrl(path);
    if (!target) {
      return null;
    }

    const { targetUrl } = target;

    console.log("-----------------------------------------");
    console.log("[PROXY] Method:", method);
    console.log("[PROXY] Original Path:", path);
    console.log("[PROXY] Target URL:", targetUrl);
    console.log("-----------------------------------------");

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
