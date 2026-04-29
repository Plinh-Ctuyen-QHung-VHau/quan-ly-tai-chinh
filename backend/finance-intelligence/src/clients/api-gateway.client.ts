import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { configuration } from "../config/configuration";

@Injectable()
export class ApiGatewayClient {
  constructor(
    private readonly httpService: HttpService,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  async notifyChatHandled(user_id: string, session_id: string) {
    if (!this.appConfig.apiGatewayUrl) {
      return;
    }

    // TODO: Align with API Gateway contract if a callback endpoint exists.
    const url = `${this.appConfig.apiGatewayUrl}/callbacks/chat-handled`;
    try {
      await firstValueFrom(
        this.httpService.post(url, { user_id, session_id }),
      );
    } catch {
      // Intentionally ignore failures for optional callback.
    }
  }
}
