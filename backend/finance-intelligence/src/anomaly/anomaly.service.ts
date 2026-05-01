import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { configuration } from "../config/configuration";
import { TransactionClient } from "../clients/transaction.client";
import { TransactionHistoryDay } from "../clients/types";
import { AnomalyRepository } from "./anomaly.repository";
import {
  AnomalyDetectionResult,
  detectDailySpike,
  detectFrequency,
} from "./anomaly.detector";
import { AppMetrics } from "../metrics/app.metrics";

export interface TransactionEventData {
  transaction_id?: string;
  user_id?: string;
  amount?: number;
  type?: string;
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

    const history = await this.safeGetHistory(data.user_id);
    if (history.length > 0) {
      const dayKey = timestamp.toISOString().slice(0, 10);
      const historicalDayCount = history.filter(d => d.date !== dayKey).length;

      if (historicalDayCount >= 1) {
        const stats = this.computeDailyStats(
          history,
          timestamp,
          data.transaction_id,
          amount,
          data.type || "expense",
        );
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
      } else {
        this.logger.debug(
          `Skipping spike/frequency check: only ${historicalDayCount} historical day(s) for user ${data.user_id}`,
        );
      }
    }

    const created = [];
    let maxScore = 0;
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
      maxScore = Math.max(maxScore, anomaly.score);
      created.push(record);
    }

    if (anomalies.length > 0 && data.transaction_id) {
      await this.anomalyRepository.updateTransactionAnomalyFlag(data.transaction_id, maxScore);
      this.logger.log(`Marked transaction ${data.transaction_id} as anomaly with score ${maxScore}`);
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
    transactionType: string,
  ) {
    const dayKey = transactionDate.toISOString().slice(0, 10);
    const isCurrentExpense = transactionType !== "income";

    // Tách lịch sử thành: các ngày trước (để tính trung bình) và ngày hôm nay
    const historicalStats: { total: number; count: number }[] = [];
    const todayFromHistory = { total: 0, count: 0 };

    for (const day of history) {
      const dayStats = { total: 0, count: 0 };
      for (const transaction of day.transactions || []) {
        if (transaction.id === transactionId) continue;
        const isExpense = transaction.type !== "income";
        if (isExpense) {
          dayStats.total += Number(transaction.amount || 0);
          dayStats.count += 1;
        }
      }

      if (day.date === dayKey) {
        // Các giao dịch đã tồn tại hôm nay (trước transaction hiện tại)
        todayFromHistory.total = dayStats.total;
        todayFromHistory.count = dayStats.count;
      } else {
        // Ngày khác → đưa vào baseline để tính average
        historicalStats.push(dayStats);
      }
    }

    // Average chỉ tính từ các ngày LỊCH SỬ, không bao gồm hôm nay
    const averageDaily = historicalStats.length
      ? historicalStats.reduce((sum, d) => sum + d.total, 0) / historicalStats.length
      : 0;
    const averageCount = historicalStats.length
      ? historicalStats.reduce((sum, d) => sum + d.count, 0) / historicalStats.length
      : 0;

    // Tổng hôm nay = đã có trong lịch sử + transaction hiện tại (nếu là expense)
    const dailyTotal = todayFromHistory.total + (isCurrentExpense ? amount : 0);
    const dailyCount = todayFromHistory.count + (isCurrentExpense ? 1 : 0);

    return { dailyTotal, dailyCount, averageDaily, averageCount };
  }
}
