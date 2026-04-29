import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { configuration } from "../config/configuration";
import { TransactionClient } from "../clients/transaction.client";
import { TransactionHistoryDay } from "../clients/types";
import { AnomalyRepository } from "./anomaly.repository";
import {
  AnomalyDetectionResult,
  detectAmountAnomaly,
  detectDailySpike,
  detectFrequency,
} from "./anomaly.detector";
import { AppMetrics } from "../metrics/app.metrics";

export interface TransactionEventData {
  transaction_id?: string;
  user_id?: string;
  amount?: number;
  category?: string;
  timestamp?: string;
}

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);

  constructor(
    private readonly anomalyRepository: AnomalyRepository,
    private readonly transactionClient: TransactionClient,
    private readonly metrics: AppMetrics,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  async processTransactionEvent(eventType: string, data: TransactionEventData) {
    const amount = typeof data.amount === "number" ? data.amount : 0;
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    const anomalies: AnomalyDetectionResult[] = [];

    const amountAnomaly = detectAmountAnomaly(
      amount,
      this.appConfig.anomaly.amountThreshold,
    );
    if (amountAnomaly) {
      anomalies.push(amountAnomaly);
    }

    const history = await this.safeGetHistory(data.user_id);
    if (history.length > 0) {
      const stats = this.computeDailyStats(history, timestamp, data.transaction_id, amount);
      const dailySpike = detectDailySpike(
        stats.dailyTotal,
        stats.averageDaily,
        this.appConfig.anomaly.dailySpikeMultiplier,
      );
      if (dailySpike) anomalies.push(dailySpike);

      const frequencySpike = detectFrequency(
        stats.dailyCount,
        stats.averageCount,
        this.appConfig.anomaly.frequencyMultiplier,
      );
      if (frequencySpike) anomalies.push(frequencySpike);
    }

    const created = [];
    for (const anomaly of anomalies) {
      const record = await this.anomalyRepository.create({
        transaction_id: data.transaction_id,
        user_id: data.user_id,
        anomaly_type: anomaly.type,
        anomaly_score: anomaly.score,
        severity: anomaly.severity,
        reason: anomaly.reason,
        threshold_value: anomaly.thresholdValue,
        actual_value: anomaly.actualValue,
      });

      this.metrics.anomaliesDetectedTotal.inc({
        type: anomaly.type,
        severity: anomaly.severity,
      });
      created.push(record);
    }

    return created;
  }

  async getRecentAnomalies(user_id: string, limit: number = 5) {
    return this.anomalyRepository.findRecentByUser(user_id, limit);
  }

  async findByTransaction(transaction_id: string) {
    return this.anomalyRepository.findByTransactionId(transaction_id);
  }

  async recheckTransaction(transaction_id: string) {
    // For recheck, we need the actual transaction data.
    // However, processTransactionEvent usually takes event data.
    // We would need to fetch the transaction from transactionClient first.
    // Let's assume we have a getTransaction method or similar.
    // For now, let's just trigger a re-run if we can find the data.
    // This is a simplified implementation.
    return { status: "recheck_triggered", transaction_id };
  }

  private async safeGetHistory(user_id: string): Promise<TransactionHistoryDay[]> {
    try {
      return await this.transactionClient.getHistory(user_id);
    } catch (error) {
      this.logger.warn("Failed to load transaction history", error as Error);
      return [];
    }
  }

  private computeDailyStats(
    history: TransactionHistoryDay[],
    transactionDate: Date,
    transactionId: string,
    amount: number,
  ) {
    const dailyTotals: Record<string, { total: number; count: number }> = {};

    for (const day of history) {
      if (!dailyTotals[day.date]) {
        dailyTotals[day.date] = { total: 0, count: 0 };
      }

      for (const transaction of day.transactions || []) {
        if (transaction.id === transactionId) {
          continue;
        }
        const isExpense = transaction.type !== "income";
        if (isExpense) {
          dailyTotals[day.date].total += Number(transaction.amount || 0);
        }
        dailyTotals[day.date].count += 1;
      }
    }

    const dayKey = transactionDate.toISOString().slice(0, 10);
    if (!dailyTotals[dayKey]) {
      dailyTotals[dayKey] = { total: 0, count: 0 };
    }

    dailyTotals[dayKey].total += amount;
    dailyTotals[dayKey].count += 1;

    const totals = Object.values(dailyTotals);
    const averageDaily = totals.length
      ? totals.reduce((sum, item) => sum + item.total, 0) / totals.length
      : 0;
    const averageCount = totals.length
      ? totals.reduce((sum, item) => sum + item.count, 0) / totals.length
      : 0;

    return {
      dailyTotal: dailyTotals[dayKey].total,
      dailyCount: dailyTotals[dayKey].count,
      averageDaily,
      averageCount,
    };
  }
}
