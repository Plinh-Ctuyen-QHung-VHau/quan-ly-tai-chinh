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
  ) { }

  async getTransactionSummary(
    user_id: string,
    start_date: string,
    end_date: string,
  ): Promise<TransactionSummary> {
    const url = `${this.appConfig.transactionServiceUrl}/transactions/summary`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { "x-user-id": user_id },
          params: { fromDate: start_date, toDate: end_date },
        }),
      );

      return response.data.data;
    } catch (error) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Không thể lấy báo cáo tổng quan từ Transaction Service",
        error,
      );
    }
  }
}
