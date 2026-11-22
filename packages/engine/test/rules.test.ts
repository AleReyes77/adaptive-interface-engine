import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, DIMENSIONS, supportRank } from "../src/profile/dimensions";
import { DEFAULT_RULES } from "../src/rules/defaults";
import { conditionSpecificity, evaluateCondition } from "../src/rules/evaluate";
import { findPersonalInference } from "../src/rules/guard";
import { validateRules } from "../src/rules/schema";
import { SIGNAL_KEYS, type SignalKey, type SignalSnapshot } from "../src/signals/compute";

function signals(values: Partial<Record<SignalKey, [number, number?]>>): SignalSnapshot {
  const entries = SIGNAL_KEYS.map((key) => {
    const [value, confidence] = values[key] ?? [0, 0];
    return [key, { value, confidence: confidence ?? 1, reasons: [] }] as const;
  });
  return Object.fromEntries(entries) as unknown as SignalSnapshot;
}

const baseRule = {
  id: "example-rule",
  description: "Shows contextual help after repeated validation errors.",
  priority: 10,
  when: { signal: "formFriction", op: "gte", value: 0.5 },
  adapt: { contextualHelp: "proactive" },
};

describe("dimensions", () => {
  it("defines a neutral default profile", () => {
    expect(DEFAULT_PROFILE).toEqual({
      explanationLevel: "standard",
      instructions: "standard",
      contextualHelp: "onError",
      navigation: "pointer",
      flowLayout: "single",
      confirmation: "standard",
    });
  });

  it("orders values from least to most support", () => {
    expect(supportRank("confirmation", "strict")).toBeGreaterThan(
      supportRank("confirmation", "elevated"),
    );
    expect(supportRank("explanationLevel", "expert")).toBe(0);
    expect(DIMENSIONS.flowLayout).toEqual(["single", "stepped"]);
  });
});

describe("validateRules", () => {
  it("accepts the built-in rules", () => {
    const result = validateRules(DEFAULT_RULES);
    expect(result).toEqual({ ok: true, rules: DEFAULT_RULES });
  });

  it("accepts a JSON round-tripped rule set", () => {
    expect(validateRules(JSON.parse(JSON.stringify(DEFAULT_RULES))).ok).toBe(true);
  });

  it("rejects rules that infer a personal trait or diagnosis", () => {
    const result = validateRules([
      { ...baseRule, description: "Simplifies the UI for users with dyslexia." },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/dyslexia/i);
  });

  it("rejects personal inference written in Spanish, with or without accents", () => {
    expect(findPersonalInference({ id: "x", description: "Detecta ansiedad del usuario" })).toEqual(
      ["ansiedad"],
    );
    expect(findPersonalInference({ id: "x", description: "Sugiere un diagnóstico" })).toHaveLength(
      1,
    );
    expect(findPersonalInference({ id: "x", description: "Adapta por edad" })).toEqual(["edad"]);
  });

  it("does not flag ordinary interface vocabulary", () => {
    expect(
      findPersonalInference({ id: "manage-page", description: "Manage page usage and storage." }),
    ).toEqual([]);
  });

  it("rejects outputs outside the closed set of interface dimensions", () => {
    expect(validateRules([{ ...baseRule, adapt: { color: "red" } }]).ok).toBe(false);
    expect(validateRules([{ ...baseRule, adapt: { contextualHelp: "always" } }]).ok).toBe(false);
    expect(validateRules([{ ...baseRule, adapt: {} }]).ok).toBe(false);
  });

  it("rejects conditions on unknown signals", () => {
    const rule = { ...baseRule, when: { signal: "heartRate", op: "gt", value: 0.5 } };
    expect(validateRules([rule]).ok).toBe(false);
  });

  it("rejects duplicate rule ids", () => {
    const result = validateRules([baseRule, baseRule]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/duplicate/i);
  });
});

describe("evaluateCondition", () => {
  it("compares a signal against a threshold", () => {
    const snapshot = signals({ confusion: [0.7] });
    expect(evaluateCondition({ signal: "confusion", op: "gte", value: 0.7 }, snapshot)).toBe(true);
    expect(evaluateCondition({ signal: "confusion", op: "gt", value: 0.7 }, snapshot)).toBe(false);
    expect(evaluateCondition({ signal: "confusion", op: "lt", value: 0.8 }, snapshot)).toBe(true);
    expect(evaluateCondition({ signal: "confusion", op: "lte", value: 0.6 }, snapshot)).toBe(false);
  });

  it("does not match when the evidence is below the required confidence", () => {
    const snapshot = signals({ keyboardReliance: [0.9, 0.4] });
    const condition = {
      signal: "keyboardReliance",
      op: "gte",
      value: 0.7,
      minConfidence: 0.6,
    } as const;
    expect(evaluateCondition(condition, snapshot)).toBe(false);
  });

  it("combines conditions with all, any and not", () => {
    const snapshot = signals({ fluency: [0.8], confusion: [0.1] });
    const condition = {
      all: [
        { signal: "fluency", op: "gte", value: 0.6 },
        {
          any: [
            { signal: "confusion", op: "gt", value: 0.5 },
            { not: { signal: "confusion", op: "gt", value: 0.3 } },
          ],
        },
      ],
    } as const;
    expect(evaluateCondition(condition, snapshot)).toBe(true);
    expect(conditionSpecificity(condition)).toBe(3);
  });
});
