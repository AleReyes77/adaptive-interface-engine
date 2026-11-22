/**
 * Weight of a piece of evidence that is `ageMs` old: 1 when fresh, halving every half-life.
 * Recent behavior matters more than old behavior, and nothing matters forever.
 */
export function decayWeight(ageMs: number, halfLifeMs: number): number {
  if (ageMs <= 0) return 1;
  return 0.5 ** (ageMs / halfLifeMs);
}

/**
 * Maps an unbounded, non-negative amount of evidence onto [0, 1).
 * `scale` is the amount of evidence that yields ~0.63; more evidence has diminishing returns.
 */
export function saturate(amount: number, scale: number): number {
  if (amount <= 0) return 0;
  return 1 - Math.exp(-amount / scale);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
