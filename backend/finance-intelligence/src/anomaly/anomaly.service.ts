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
  ) { }

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
          `Bỏ qua kiểm tra bất thường: User ${data.user_id} mới có ${historicalDayCount} ngày lịch sử giao dịch.`,
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
      this.logger.log(`Đã đánh dấu giao dịch ${data.transaction_id} là bất thường (điểm: ${maxScore})`);
    }

    return created;
  }

  async getRecentAnomalies(user_id: string, limit: number = 5, fromDate?: string, toDate?: string) {
    return this.anomalyRepository.findRecentByUser(user_id, limit, fromDate, toDate);
  }

  async findByTransaction(transaction_id: string) {
    return this.anomalyRepository.findByTransactionId(transaction_id);
  }

  async recheckTransaction(transaction_id: string) {
    return { status: "recheck_triggered", transaction_id };
  }

  private async safeGetHistory(user_id: string): Promise<TransactionHistoryDay[]> {
    try {
      return await this.transactionClient.getHistory(user_id);
    } catch (error) {
      this.logger.warn("Lấy lịch sử giao dịch thất bại, có thể service kia đang sập", error as Error);
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
        todayFromHistory.total = dayStats.total;
        todayFromHistory.count = dayStats.count;
      } else {
        historicalStats.push(dayStats);
      }
    }

    const averageDaily = historicalStats.length
      ? historicalStats.reduce((sum, d) => sum + d.total, 0) / historicalStats.length
      : 0;
    const averageCount = historicalStats.length
      ? historicalStats.reduce((sum, d) => sum + d.count, 0) / historicalStats.length
      : 0;

    const dailyTotal = todayFromHistory.total + (isCurrentExpense ? amount : 0);
    const dailyCount = todayFromHistory.count + (isCurrentExpense ? 1 : 0);

    return { dailyTotal, dailyCount, averageDaily, averageCount };
  }
}
