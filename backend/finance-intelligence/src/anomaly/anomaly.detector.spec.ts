import test from "node:test";
import assert from "node:assert/strict";
import { detectAmountAnomaly } from "./anomaly.detector";

test("detectAmountAnomaly flags large values", () => {
  const result = detectAmountAnomaly(10000000, 5000000);
  assert.ok(result);
  assert.equal(result?.type, "amount");
  assert.equal(result?.severity, "medium");
});
