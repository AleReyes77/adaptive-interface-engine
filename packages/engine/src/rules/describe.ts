import type { ComparisonOp, Condition } from "./types";

const SYMBOL: Record<ComparisonOp, string> = { gt: ">", gte: "≥", lt: "<", lte: "≤" };

/** Renders a condition tree as readable notation, for inspectors and documentation. */
export function describeCondition(condition: Condition, nested = false): string {
  if ("all" in condition || "any" in condition) {
    const [joiner, parts] = "all" in condition ? [" and ", condition.all] : [" or ", condition.any];
    const text = parts.map((part) => describeCondition(part, true)).join(joiner);
    return nested && parts.length > 1 ? `(${text})` : text;
  }
  if ("not" in condition) return `not ${describeCondition(condition.not, true)}`;
  const confidence =
    condition.minConfidence === undefined ? "" : ` (confidence ≥ ${condition.minConfidence})`;
  return `${condition.signal} ${SYMBOL[condition.op]} ${condition.value}${confidence}`;
}
