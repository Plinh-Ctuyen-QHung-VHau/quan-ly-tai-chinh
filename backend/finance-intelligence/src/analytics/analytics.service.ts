import { Injectable } from "@nestjs/common";
import { TransactionClient } from "../clients/transaction.client";
import { TransactionSummary } from "../clients/types";

@Injectable()
export class AnalyticsService {
  constructor(private readonly transactionClient: TransactionClient) { }

  async getSpendingSummary(
    user_id: string,
    fromDate?: string,
    toDate?: string,
    type?: string,
  ): Promise<TransactionSummary> {
    const finalFrom = fromDate || this.getDefaultStartDate();
    const finalTo = toDate || new Date().toISOString().slice(0, 10);

    return this.transactionClient.getSummary(user_id, finalFrom, finalTo, type);
  }

  private getDefaultStartDate() {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }
}
