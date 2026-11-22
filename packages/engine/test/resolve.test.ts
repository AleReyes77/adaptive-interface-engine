import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "../src/profile/dimensions";
import { resolveProfile } from "../src/profile/resolve";
import type { Rule } from "../src/rules/types";
import { SIGNAL_KEYS, type SignalKey, type SignalSnapshot } from "../src/signals/compute";

function signals(values: Partial<Record<SignalKey, number>>): SignalSnapshot {
  return Object.fromEntries(
    SIGNAL_KEYS.map((key) => [key, { value: values[key] ?? 0, confidence: 1, reasons: [] }]),
  ) as unknown as SignalSnapshot;
}

function rule(id: string, priority: number, extra: Partial<Rule> = {}): Rule {
  return {
    id,
    priority,
    description: `Rule ${id} for testing purposes.`,
    when: { signal: "confusion", op: "gte", value: 0.5 },
    adapt: { confirmation: "elevated" },
    ...extra,
  };
}

const confused = signals({ confusion: 0.9 });

describe("resolveProfile", () => {
  it("returns the default profile when no rule matches", () => {
    const result = resolveProfile([rule("a", 10)], signals({}));
    expect(result.profile).toEqual(DEFAULT_PROFILE);
    expect(result.matchedRuleIds).toEqual([]);
    expect(result.decisions.confirmation.source).toBe("default");
  });

  it("lets the higher priority rule win a dimension and records who lost", () => {
    const rules = [rule("elevate", 60), rule("strict", 70, { adapt: { confirmation: "strict" } })];
    const result = resolveProfile(rules, confused);
    expect(result.profile.confirmation).toBe("strict");
    expect(result.decisions.confirmation).toMatchObject({
      source: "rule",
      ruleId: "strict",
      reason: "Rule strict for testing purposes.",
      outranked: ["elevate"],
    });
    expect(result.matchedRuleIds).toEqual(["elevate", "strict"]);
  });

  it("breaks priority ties by specificity, then by id", () => {
    const specific = rule("z-specific", 50, {
      when: {
        all: [
          { signal: "confusion", op: "gte", value: 0.5 },
          { signal: "fluency", op: "lt", value: 0.5 },
        ],
      },
      adapt: { confirmation: "strict" },
    });
    expect(resolveProfile([rule("a-generic", 50), specific], confused).profile.confirmation).toBe(
      "strict",
    );

    const b = rule("b", 50, { adapt: { confirmation: "strict" } });
    expect(resolveProfile([b, rule("a", 50)], confused).decisions.confirmation.ruleId).toBe("a");
  });

  it("applies a person's override over any rule", () => {
    const result = resolveProfile([rule("elevate", 90)], confused, { confirmation: "standard" });
    expect(result.profile.confirmation).toBe("standard");
    expect(result.decisions.confirmation).toMatchObject({
      source: "override",
      outranked: ["elevate"],
    });
  });

  it("only touches the dimensions a rule names", () => {
    const result = resolveProfile([rule("elevate", 10)], confused);
    expect(result.profile).toEqual({ ...DEFAULT_PROFILE, confirmation: "elevated" });
    expect(result.decisions.navigation.source).toBe("default");
  });
});
