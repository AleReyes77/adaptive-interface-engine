import { describe, expect, it } from "vitest";
import { describeCondition } from "../src/rules/describe";

describe("describeCondition", () => {
  it("renders a comparison in plain notation", () => {
    expect(describeCondition({ signal: "confusion", op: "gte", value: 0.55 })).toBe(
      "confusion ≥ 0.55",
    );
    expect(
      describeCondition({ signal: "keyboardReliance", op: "gt", value: 0.7, minConfidence: 0.6 }),
    ).toBe("keyboardReliance > 0.7 (confidence ≥ 0.6)");
  });

  it("renders nested groups with explicit grouping", () => {
    expect(
      describeCondition({
        any: [
          { signal: "flowStruggle", op: "gte", value: 0.5 },
          {
            all: [
              { signal: "confusion", op: "gte", value: 0.5 },
              { not: { signal: "experience", op: "gte", value: 0.4 } },
            ],
          },
        ],
      }),
    ).toBe("flowStruggle ≥ 0.5 or (confusion ≥ 0.5 and not experience ≥ 0.4)");
  });
});
