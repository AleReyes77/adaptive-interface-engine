import type { ProfilePatch } from "../profile/dimensions";
import type { SignalKey } from "../signals/compute";

export type ComparisonOp = "gt" | "gte" | "lt" | "lte";

/** Compares one signal against a threshold, optionally requiring a minimum confidence. */
export interface Comparison {
  readonly signal: SignalKey;
  readonly op: ComparisonOp;
  readonly value: number;
  readonly minConfidence?: number;
}

/** A JSON-serializable condition tree. */
export type Condition =
  | Comparison
  | { readonly all: readonly Condition[] }
  | { readonly any: readonly Condition[] }
  | { readonly not: Condition };

/**
 * A declarative adaptation rule.
 *
 * `description` is user-facing: it is what the person reads when they ask why the interface
 * changed, so it must describe the interaction, never the person.
 */
export interface Rule {
  readonly id: string;
  readonly description: string;
  /** 0–100. When rules disagree on a dimension, the higher priority wins. */
  readonly priority: number;
  readonly when: Condition;
  readonly adapt: ProfilePatch;
}
