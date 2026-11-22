import type { SignalSnapshot } from "../signals/compute";
import type { Comparison, Condition } from "./types";

function compare(comparison: Comparison, signals: SignalSnapshot): boolean {
  const signal = signals[comparison.signal];
  if (comparison.minConfidence !== undefined && signal.confidence < comparison.minConfidence) {
    return false;
  }
  switch (comparison.op) {
    case "gt":
      return signal.value > comparison.value;
    case "gte":
      return signal.value >= comparison.value;
    case "lt":
      return signal.value < comparison.value;
    case "lte":
      return signal.value <= comparison.value;
  }
}

/** Evaluates a condition tree against a signal snapshot. */
export function evaluateCondition(condition: Condition, signals: SignalSnapshot): boolean {
  if ("all" in condition) return condition.all.every((c) => evaluateCondition(c, signals));
  if ("any" in condition) return condition.any.some((c) => evaluateCondition(c, signals));
  if ("not" in condition) return !evaluateCondition(condition.not, signals);
  return compare(condition, signals);
}

/** Number of comparisons in a condition. Used to break priority ties: more specific rules win. */
export function conditionSpecificity(condition: Condition): number {
  if ("all" in condition) return condition.all.reduce((n, c) => n + conditionSpecificity(c), 0);
  if ("any" in condition) return condition.any.reduce((n, c) => n + conditionSpecificity(c), 0);
  if ("not" in condition) return conditionSpecificity(condition.not);
  return 1;
}
