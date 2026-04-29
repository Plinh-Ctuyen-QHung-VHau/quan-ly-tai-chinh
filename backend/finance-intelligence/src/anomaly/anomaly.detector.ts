export type AnomalyType = "amount" | "daily_spike" | "frequency";
export type Severity = "low" | "medium" | "high";

export interface AnomalyDetectionResult {
  type: AnomalyType;
  score: number;
  severity: Severity;
  reason: string;
  thresholdValue?: number;
  actualValue?: number;
}

export function detectAmountAnomaly(
  amount: number,
  threshold: number,
): AnomalyDetectionResult | null {
  if (amount <= 0 || threshold <= 0 || amount < threshold) {
    return null;
  }

  const ratio = amount / threshold;
  const severity: Severity = ratio >= 3 ? "high" : ratio >= 2 ? "medium" : "low";
  const score = Math.min(1, ratio / 3);

  return {
    type: "amount",
    score,
    severity,
    reason: `Amount ${amount} exceeds threshold ${threshold}`,
    thresholdValue: threshold,
    actualValue: amount,
  };
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
    reason: `Daily total ${dailyTotal} exceeds average spike threshold ${threshold}`,
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
    reason: `Daily count ${dailyCount} exceeds frequency threshold ${threshold}`,
    thresholdValue: threshold,
    actualValue: dailyCount,
  };
}
