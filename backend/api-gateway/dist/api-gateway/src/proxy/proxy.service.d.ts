import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { Request } from "express";
import { AxiosResponse } from "axios";
export declare class ProxyService {
    private readonly configService;
    private readonly httpService;
    private serviceUrls;
    constructor(configService: ConfigService, httpService: HttpService);
    private getTargetUrl;
    proxyRequest(req: Request): Promise<AxiosResponse<any>>;
}
