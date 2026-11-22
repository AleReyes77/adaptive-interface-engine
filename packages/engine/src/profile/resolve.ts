import { conditionSpecificity, evaluateCondition } from "../rules/evaluate";
import type { Rule } from "../rules/types";
import type { SignalSnapshot } from "../signals/compute";
import {
  type AdaptationProfile,
  DEFAULT_PROFILE,
  DIMENSION_KEYS,
  type Dimension,
  type ProfilePatch,
} from "./dimensions";

export type DecisionSource = "default" | "rule" | "override";

/** Why a dimension has the value it has. This is what the "why did this change?" UI shows. */
export interface DimensionDecision {
  readonly dimension: Dimension;
  readonly value: string;
  readonly source: DecisionSource;
  readonly ruleId?: string;
  readonly reason: string;
  /** Matched rules that also wanted to set this dimension but lost. */
  readonly outranked: readonly string[];
}

export type DecisionMap = { readonly [D in Dimension]: DimensionDecision };

export interface Resolution {
  readonly profile: AdaptationProfile;
  readonly decisions: DecisionMap;
  /** Ids of every rule whose condition matched, in rule-set order. */
  readonly matchedRuleIds: readonly string[];
}

export const DEFAULT_REASON =
  "Default setting: nothing in your recent interactions called for a change.";
export const OVERRIDE_REASON = "You chose this setting, so the engine will not change it.";

/** Higher priority first, then more specific conditions, then alphabetical id for determinism. */
function compareRules(a: Rule, b: Rule): number {
  return (
    b.priority - a.priority ||
    conditionSpecificity(b.when) - conditionSpecificity(a.when) ||
    a.id.localeCompare(b.id)
  );
}

export function overrideDecision(
  dimension: Dimension,
  value: string,
  outranked: readonly string[],
): DimensionDecision {
  return { dimension, value, source: "override", reason: OVERRIDE_REASON, outranked };
}

/**
 * Resolves the adaptation profile for the current signals.
 * Each dimension is decided independently: a person's override wins, otherwise the best matching
 * rule that sets that dimension wins, otherwise the default applies.
 */
export function resolveProfile(
  rules: readonly Rule[],
  signals: SignalSnapshot,
  overrides: ProfilePatch = {},
): Resolution {
  const matched = rules.filter((rule) => evaluateCondition(rule.when, signals));
  const ranked = [...matched].sort(compareRules);

  const profile: Record<string, string> = { ...DEFAULT_PROFILE };
  const decisions = {} as Record<Dimension, DimensionDecision>;

  for (const dimension of DIMENSION_KEYS) {
    const contenders = ranked.filter((rule) => rule.adapt[dimension] !== undefined);
    const [winner, ...losers] = contenders;
    const override = overrides[dimension];

    let decision: DimensionDecision;
    if (override !== undefined) {
      decision = overrideDecision(
        dimension,
        override,
        contenders.map((rule) => rule.id),
      );
    } else if (winner) {
      decision = {
        dimension,
        value: winner.adapt[dimension] as string,
        source: "rule",
        ruleId: winner.id,
        reason: winner.description,
        outranked: losers.map((rule) => rule.id),
      };
    } else {
      decision = {
        dimension,
        value: DEFAULT_PROFILE[dimension],
        source: "default",
        reason: DEFAULT_REASON,
        outranked: [],
      };
    }

    decisions[dimension] = decision;
    profile[dimension] = decision.value;
  }

  return {
    profile: profile as unknown as AdaptationProfile,
    decisions,
    matchedRuleIds: matched.map((rule) => rule.id),
  };
}
