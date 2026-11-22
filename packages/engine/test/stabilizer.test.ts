import { describe, expect, it } from "vitest";
import { type AdaptationProfile, DEFAULT_PROFILE } from "../src/profile/dimensions";
import { createStabilizer } from "../src/profile/stabilizer";

const simplified: AdaptationProfile = { ...DEFAULT_PROFILE, explanationLevel: "simplified" };

describe("createStabilizer", () => {
  it("applies a change towards more support immediately", () => {
    const stabilizer = createStabilizer();
    expect(stabilizer.next(simplified, 0)).toEqual(simplified);
  });

  it("waits until a change towards less support has held for relaxAfterMs", () => {
    const stabilizer = createStabilizer({ relaxAfterMs: 20_000 });
    stabilizer.next(simplified, 0);
    stabilizer.next(DEFAULT_PROFILE, 1_000);
    expect(stabilizer.next(DEFAULT_PROFILE, 20_999).explanationLevel).toBe("simplified");
    expect(stabilizer.pending().explanationLevel).toEqual({ value: "standard", since: 1_000 });
    expect(stabilizer.next(DEFAULT_PROFILE, 21_000).explanationLevel).toBe("standard");
    expect(stabilizer.pending()).toEqual({});
  });

  it("does not flap when the target oscillates around a threshold", () => {
    const stabilizer = createStabilizer();
    let changes = 0;
    let previous = stabilizer.next(DEFAULT_PROFILE, 0).explanationLevel;
    for (let t = 1_000; t <= 60_000; t += 1_000) {
      const target = (t / 1_000) % 2 === 0 ? simplified : DEFAULT_PROFILE;
      const current = stabilizer.next(target, t).explanationLevel;
      if (current !== previous) changes++;
      previous = current;
    }
    expect(changes).toBeLessThanOrEqual(2);
  });

  it("respects the cooldown between two escalations of the same dimension", () => {
    const stabilizer = createStabilizer({
      cooldownMs: 4_000,
      initial: { ...DEFAULT_PROFILE, explanationLevel: "expert" },
    });
    expect(stabilizer.next(DEFAULT_PROFILE, 0).explanationLevel).toBe("standard");
    expect(stabilizer.next(simplified, 1_000).explanationLevel).toBe("standard");
    expect(stabilizer.next(simplified, 4_000).explanationLevel).toBe("simplified");
  });

  it("never delays a stricter confirmation for an irreversible action", () => {
    const stabilizer = createStabilizer({ cooldownMs: 4_000 });
    stabilizer.next({ ...DEFAULT_PROFILE, confirmation: "elevated" }, 0);
    const next = stabilizer.next({ ...DEFAULT_PROFILE, confirmation: "strict" }, 500);
    expect(next.confirmation).toBe("strict");
  });

  it("returns the same object while nothing changes", () => {
    const stabilizer = createStabilizer();
    const first = stabilizer.next(simplified, 0);
    expect(stabilizer.next(simplified, 1_000)).toBe(first);
  });

  it("can be reset to its initial profile", () => {
    const stabilizer = createStabilizer();
    stabilizer.next(simplified, 0);
    stabilizer.reset();
    expect(stabilizer.next(DEFAULT_PROFILE, 1)).toEqual(DEFAULT_PROFILE);
  });
});
