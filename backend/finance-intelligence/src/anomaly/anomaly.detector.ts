export type AnomalyType = "daily_spike" | "frequency";
export type Severity = "low" | "medium" | "high";

export interface AnomalyDetectionResult {
  type: AnomalyType;
  score: number;
  severity: Severity;
  reason: string;
  thresholdValue?: number;
  actualValue?: number;
}


export function detectDailySpike(
  dailyTotal: number,
  averageDaily: number,
  multiplier: number,
): AnomalyDetectionResult | null {
  if (averageDaily <= 0 || dailyTotal <= 0) {
    return null;
  }

  const threshold = averageDaily * multiplier;
  if (dailyTotal < threshold) {
    return null;
  }

  const ratio = dailyTotal / threshold;
  const severity: Severity = ratio >= 2 ? "high" : ratio >= 1.5 ? "medium" : "low";
  const score = Math.min(1, ratio / 2);

  return {
    type: "daily_spike",
    score,
    severity,
    reason: `Tổng chi tiêu trong ngày (${dailyTotal}) vượt mức trung bình bình thường (${threshold})`,
    thresholdValue: threshold,
    actualValue: dailyTotal,
  };
}

export function detectFrequency(
  dailyCount: number,
  averageCount: number,
  multiplier: number,
): AnomalyDetectionResult | null {
  if (averageCount <= 0 || dailyCount <= 0) {
    return null;
  }

  const threshold = averageCount * multiplier;
  if (dailyCount < threshold) {
    return null;
  }

  const ratio = dailyCount / threshold;
  const severity: Severity = ratio >= 2 ? "high" : ratio >= 1.5 ? "medium" : "low";
  const score = Math.min(1, ratio / 2);

  return {
    type: "frequency",
    score,
    severity,
    reason: `Số lần giao dịch trong ngày (${dailyCount}) cao bất thường so với mức trung bình (${threshold})`,
    thresholdValue: threshold,
    actualValue: dailyCount,
  };
}
