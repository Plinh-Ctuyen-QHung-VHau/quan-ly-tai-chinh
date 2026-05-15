import { detectDailySpike, detectFrequency } from './anomaly.detector';

// File này thay thế spec cũ dùng node:test (không tương thích Jest)
describe('AnomalyDetector – unit tests', () => {
  it('detectDailySpike flags large daily spend', () => {
    const result = detectDailySpike(10_000_000, 5_000_000, 2);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('daily_spike');
    expect(result?.severity).toBe('medium');
  });

  it('detectDailySpike returns null for normal spend', () => {
    const result = detectDailySpike(100_000, 1_000_000, 2);
    expect(result).toBeNull();
  });

  it('detectFrequency flags unusual transaction frequency', () => {
    const result = detectFrequency(20, 3, 2);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('frequency');
  });

  it('detectFrequency returns null for normal frequency', () => {
    const result = detectFrequency(2, 3, 2);
    expect(result).toBeNull();
  });
});
