import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { configuration } from "../config/configuration";
import { TransactionHistoryDay, TransactionSummary, CreateTransactionRequest, TransactionRecord } from "./types";
import { AppError } from "@shared/errors/AppError";
import { ERROR_CODES } from "@shared/errors/errorCodes";

@Injectable()
export class TransactionClient {
  private readonly logger = new Logger(TransactionClient.name);
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
    type?: string,
  ): Promise<TransactionSummary> {
    const url = `${this.appConfig.transactionServiceUrl}/transactions/summary`;
    this.logger.log(`Fetching summary from: ${url} with params: fromDate=${fromDate}, toDate=${toDate}`);
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { "x-user-id": user_id },
          params: { fromDate, toDate }, // Bỏ type ở đây để tránh lỗi 400/404 nếu service chưa update
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

  async createTransaction(
    user_id: string,
    payload: CreateTransactionRequest,
  ): Promise<TransactionRecord> {
    const url = `${this.appConfig.transactionServiceUrl}/transactions`;
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { "x-user-id": user_id },
        }),
      );
      return response.data?.data;
    } catch (error) {
      this.logger.error(`createTransaction failed: ${JSON.stringify(error.response?.data)}`);
      throw new AppError(
        "Failed to create transaction",
        ERROR_CODES.SERVICE_UNAVAILABLE,
        error,
      );
    }
  }

  async getCategories(user_id: string): Promise<any[]> {
    const url = `${this.appConfig.transactionServiceUrl}/categories`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { "x-user-id": user_id },
        }),
      );
      return response.data?.data || [];
    } catch (error) {
      this.logger.warn("Failed to fetch categories", error);
      return [];
    }
  }
}
