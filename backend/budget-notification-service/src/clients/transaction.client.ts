import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { configuration } from "../config/configuration";
import { TransactionSummary } from "./transaction-summary.interface";
import { AppError } from "@shared/errors/AppError";
import { ERROR_CODES } from "@shared/errors/errorCodes";

@Injectable()
export class TransactionClient {
  constructor(
    private readonly httpService: HttpService,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  async getTransactionSummary(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<TransactionSummary> {
    const url = `${this.appConfig.transactionServiceUrl}/transactions/summary`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { "x-user-id": userId },
          params: { startDate, endDate },
        }),
      );
      // Assuming the actual summary is in response.data.data
      return response.data.data;
    } catch (error) {
      // console.error('Error fetching transaction summary:', error);
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Failed to fetch transaction summary.",
        error,
      );
    }
  }
}
