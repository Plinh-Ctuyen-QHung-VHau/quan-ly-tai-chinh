import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { configuration } from "../config/configuration";
import { TransactionHistoryDay, TransactionSummary } from "./types";
import { AppError } from "@shared/errors/AppError";
import { ERROR_CODES } from "@shared/errors/errorCodes";

@Injectable()
export class TransactionClient {
  constructor(
    private readonly httpService: HttpService,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  async getHistory(user_id: string): Promise<TransactionHistoryDay[]> {
    const url = `${this.appConfig.transactionServiceUrl}/transactions/history`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { "x-user-id": user_id },
        }),
      );
      return response.data?.data || [];
    } catch (error) {
      throw new AppError(
        "Failed to fetch transaction history",
        ERROR_CODES.SERVICE_UNAVAILABLE,
        error,
      );
    }
  }

  async getSummary(
    user_id: string,
    fromDate: string,
    toDate: string,
  ): Promise<TransactionSummary> {
    const url = `${this.appConfig.transactionServiceUrl}/transactions/summary`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { "x-user-id": user_id },
          params: { fromDate, toDate },
        }),
      );
      return response.data?.data;
    } catch (error) {
      throw new AppError(
        "Failed to fetch transaction summary",
        ERROR_CODES.SERVICE_UNAVAILABLE,
        error,
      );
    }
  }
}
