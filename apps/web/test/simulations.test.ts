import { createAdaptiveEngine } from "@aie/engine";
import { describe, expect, it } from "vitest";
import { SIMULATIONS, type SimulationId } from "@/lib/simulations";

const ALL = { interaction: true, forms: true, timing: true, modality: true, remember: false };

function run(id: SimulationId) {
  let now = 0;
  const engine = createAdaptiveEngine({ consent: ALL, clock: () => now });
  for (const event of SIMULATIONS[id].events()) expect(engine.track(event)).toBe(true);
  return {
    ...engine.getSnapshot().profile,
    pending: engine.getSnapshot().pending,
    after(ms: number) {
      now += ms;
      engine.tick();
      return engine.getSnapshot().profile;
    },
  };
}

describe("behavior simulations", () => {
  it("confusion simplifies explanations and splits the migration into steps", () => {
    const profile = run("confused");
    expect(profile.explanationLevel).toBe("simplified");
    expect(profile.flowLayout).toBe("stepped");
    expect(profile.confirmation).toBe("elevated");
  });

  it("a fast pace hardens confirmations at once and condenses guidance once it holds", () => {
    const result = run("fluent");
    expect(result.confirmation).toBe("strict");
    expect(result.instructions).toBe("detailed");
    expect(result.pending.instructions?.value).toBe("minimal");
    const later = result.after(20_000);
    expect(later.instructions).toBe("minimal");
    expect(later.explanationLevel).toBe("expert");
  });

  it("form errors turn on proactive field help", () => {
    expect(run("formErrors").contextualHelp).toBe("proactive");
  });

  it("keyboard use turns on keyboard affordances", () => {
    expect(run("keyboard").navigation).toBe("keyboard");
  });

  it("backing out of risky actions makes confirmations explicit", () => {
    expect(run("riskHesitation").confirmation).toBe("elevated");
  });

  it("describes every simulation for the person running it", () => {
    for (const simulation of Object.values(SIMULATIONS)) {
      expect(simulation.label.length).toBeGreaterThan(3);
      expect(simulation.description.length).toBeGreaterThan(10);
    }
  });
});
