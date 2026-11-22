import { describe, expect, it, vi } from "vitest";
import { createAdaptiveEngine, type EngineOptions } from "../src/engine";
import { DEFAULT_CONSENT } from "../src/privacy/consent";
import { DEFAULT_PROFILE } from "../src/profile/dimensions";

const ALL_CONSENT = {
  interaction: true,
  forms: true,
  timing: true,
  modality: true,
  remember: false,
};

function setup(options: EngineOptions = {}) {
  let now = 1_000_000;
  const engine = createAdaptiveEngine({ clock: () => now, consent: ALL_CONSENT, ...options });
  return {
    engine,
    advance(ms: number) {
      now += ms;
    },
  };
}

const help = { type: "help.opened", topicId: "replication" } as const;
const fieldError = { type: "field.error", formId: "deploy", fieldId: "replicas", code: "range" };

describe("createAdaptiveEngine", () => {
  it("observes nothing and adapts nothing without consent", () => {
    const { engine } = setup({ consent: DEFAULT_CONSENT });
    expect(engine.track(help)).toBe(false);
    const snapshot = engine.getSnapshot();
    expect(snapshot.events).toEqual([]);
    expect(snapshot.profile).toEqual(DEFAULT_PROFILE);
    expect(snapshot.matchedRuleIds).toEqual([]);
  });

  it("simplifies explanations after repeated requests for help", () => {
    const { engine } = setup();
    for (let i = 0; i < 3; i++) expect(engine.track(help)).toBe(true);
    const { profile, decisions } = engine.getSnapshot();
    expect(profile.explanationLevel).toBe("simplified");
    expect(decisions.explanationLevel).toMatchObject({
      source: "rule",
      ruleId: "simplify-after-confusion",
    });
  });

  it("rejects malformed events", () => {
    const { engine } = setup();
    expect(engine.track({ type: "help.opened", topicId: "ana@mail.com" })).toBe(false);
    expect(engine.getSnapshot().events).toEqual([]);
  });

  it("purges a category's events and drops its adaptations as soon as consent is revoked", () => {
    const { engine } = setup();
    for (let i = 0; i < 3; i++) engine.track(help);
    engine.track(fieldError);
    engine.setConsent({ interaction: false });
    const snapshot = engine.getSnapshot();
    expect(snapshot.events.map((e) => e.type)).toEqual(["field.error"]);
    expect(snapshot.profile.explanationLevel).toBe("standard");
    expect(snapshot.consent.interaction).toBe(false);
  });

  it("stops observing and shows the standard interface while paused", () => {
    const { engine } = setup();
    for (let i = 0; i < 3; i++) engine.track(help);
    engine.setPaused(true);
    expect(engine.track(help)).toBe(false);
    expect(engine.getSnapshot().profile.explanationLevel).toBe("standard");
    engine.setPaused(false);
    expect(engine.getSnapshot().profile.explanationLevel).toBe("simplified");
  });

  it("counts completed tasks and forgets everything on request", () => {
    const { engine } = setup({ completedTasksTotal: 4 });
    engine.track({ type: "task.completed", taskId: "deploy", durationMs: 30_000 });
    expect(engine.getSnapshot().completedTasksTotal).toBe(5);
    engine.forget();
    const snapshot = engine.getSnapshot();
    expect(snapshot.events).toEqual([]);
    expect(snapshot.completedTasksTotal).toBe(0);
    expect(snapshot.consent).toEqual(ALL_CONSENT);
  });

  it("lets a person override any dimension and remove the override", () => {
    const { engine } = setup();
    for (let i = 0; i < 3; i++) engine.track(help);
    engine.setOverride("explanationLevel", "expert");
    expect(engine.getSnapshot().profile.explanationLevel).toBe("expert");
    expect(engine.getSnapshot().decisions.explanationLevel).toMatchObject({
      source: "override",
      outranked: ["simplify-after-confusion"],
    });
    engine.setOverride("explanationLevel", null);
    expect(engine.getSnapshot().profile.explanationLevel).toBe("simplified");
    expect(() => engine.setOverride("explanationLevel", "loud" as never)).toThrow(TypeError);
  });

  it("keeps the previous decision visible while a relaxation is pending", () => {
    const { engine, advance } = setup();
    for (let i = 0; i < 3; i++) engine.track(help);
    advance(30 * 60_000);
    engine.tick();
    const snapshot = engine.getSnapshot();
    expect(snapshot.profile.explanationLevel).toBe("simplified");
    expect(snapshot.decisions.explanationLevel.ruleId).toBe("simplify-after-confusion");
    expect(snapshot.pending.explanationLevel?.value).toBe("standard");
    advance(20_000);
    engine.tick();
    expect(engine.getSnapshot().profile.explanationLevel).toBe("standard");
  });

  it("returns the same snapshot until something changes and notifies subscribers", () => {
    const { engine } = setup();
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);
    const first = engine.getSnapshot();
    engine.tick();
    expect(engine.getSnapshot()).toBe(first);
    expect(listener).not.toHaveBeenCalled();
    engine.track(help);
    expect(engine.getSnapshot()).not.toBe(first);
    expect(engine.getSnapshot().revision).toBeGreaterThan(first.revision);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    engine.track(help);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("refuses an invalid rule set at creation", () => {
    expect(() =>
      createAdaptiveEngine({
        rules: [
          {
            id: "bad",
            description: "Detects anxiety from clicks.",
            priority: 1,
            when: { signal: "confusion", op: "gt", value: 0.5 },
            adapt: { instructions: "detailed" },
          },
        ],
      }),
    ).toThrow(/interactions, not people/);
  });

  it("exports everything it holds as plain JSON", () => {
    const { engine } = setup();
    engine.track(help);
    const exported = JSON.parse(JSON.stringify(engine.exportData()));
    expect(exported).toMatchObject({
      format: "adaptive-interface-engine/v1",
      consent: ALL_CONSENT,
      events: [{ type: "help.opened", topicId: "replication" }],
      completedTasksTotal: 0,
    });
    expect(typeof exported.exportedAt).toBe("string");
  });
});
