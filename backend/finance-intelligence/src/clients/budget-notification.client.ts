import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { configuration } from "../config/configuration";
import { BudgetStatus } from "./types";
import { AppError } from "@shared/errors/AppError";
import { ERROR_CODES } from "@shared/errors/errorCodes";

@Injectable()
export class BudgetNotificationClient {
  constructor(
    private readonly httpService: HttpService,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  async getCurrentStatus(user_id: string): Promise<BudgetStatus> {
    const url = `${this.appConfig.budgetNotificationServiceUrl}/budgets/current/status`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { "x-user-id": user_id },
        }),
      );
      return response.data?.data;
    } catch (error) {
      throw new AppError(
        "Failed to fetch budget status",
        ERROR_CODES.SERVICE_UNAVAILABLE,
        error,
      );
    }
  }
}
