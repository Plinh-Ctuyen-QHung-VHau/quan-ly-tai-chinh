import { Injectable } from "@nestjs/common";
import { TransactionClient } from "../clients/transaction.client";
import { TransactionSummary } from "../clients/types";

@Injectable()
export class AnalyticsService {
  constructor(private readonly transactionClient: TransactionClient) {}

  async getSpendingSummary(
    user_id: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<TransactionSummary> {
    const range = this.resolveDateRange(fromDate, toDate);
    return this.transactionClient.getSummary(user_id, range.fromDate, range.toDate);
  }

  private resolveDateRange(fromDate?: string, toDate?: string) {
    const parsedEnd = toDate ? new Date(toDate) : null;
    const end = parsedEnd && !isNaN(parsedEnd.getTime()) ? parsedEnd : new Date();

    const parsedStart = fromDate ? new Date(fromDate) : null;
    const start =
      parsedStart && !isNaN(parsedStart.getTime())
        ? parsedStart
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      fromDate: start.toISOString().slice(0, 10),
      toDate: end.toISOString().slice(0, 10),
    };
  }
}
