import { describe, expect, it } from "vitest";
import type { InteractionEvent, TrackedEvent } from "../src/events/taxonomy";
import { computeSignals, SIGNAL_KEYS } from "../src/signals/compute";
import { decayWeight, saturate } from "../src/signals/decay";

const NOW = 10_000_000;
const MIN = 60_000;

function at(offsetMs: number, event: InteractionEvent): TrackedEvent {
  return { ...event, at: NOW - offsetMs };
}

function times<T>(n: number, make: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => make(i));
}

const help = (ago = 0) => at(ago, { type: "help.opened", topicId: "topic" });
const fastStep = (ago = 0) =>
  at(ago, { type: "step.completed", flowId: "migration", step: 1, durationMs: 4_000 });
const fieldError = (ago = 0) =>
  at(ago, { type: "field.error", formId: "deploy", fieldId: "replicas", code: "range" });
const modality = (m: "pointer" | "keyboard") => at(0, { type: "input.modality", modality: m });

describe("decay helpers", () => {
  it("halves the weight every half-life", () => {
    expect(decayWeight(0, 1_000)).toBe(1);
    expect(decayWeight(1_000, 1_000)).toBeCloseTo(0.5);
    expect(decayWeight(2_000, 1_000)).toBeCloseTo(0.25);
    expect(decayWeight(-5, 1_000)).toBe(1);
  });

  it("saturates towards 1 and never goes below 0", () => {
    expect(saturate(0, 3)).toBe(0);
    expect(saturate(-2, 3)).toBe(0);
    expect(saturate(3, 3)).toBeCloseTo(1 - Math.exp(-1));
    expect(saturate(1_000, 3)).toBeLessThanOrEqual(1);
  });
});

describe("computeSignals", () => {
  it("reports zero for every signal when nothing happened", () => {
    const signals = computeSignals([], NOW, { completedTasksTotal: 0 });
    for (const key of SIGNAL_KEYS) {
      expect(signals[key].value).toBe(0);
      expect(signals[key].reasons).toEqual([]);
    }
  });

  it("raises confusion after help is opened repeatedly", () => {
    const signals = computeSignals(
      times(3, () => help()),
      NOW,
      { completedTasksTotal: 0 },
    );
    expect(signals.confusion.value).toBeGreaterThan(0.6);
    expect(signals.confusion.confidence).toBe(1);
    expect(signals.confusion.reasons).toContain("Opened help 3 times");
  });

  it("lets old evidence fade away", () => {
    const signals = computeSignals(
      times(3, () => help(20 * MIN)),
      NOW,
      { completedTasksTotal: 0 },
    );
    expect(signals.confusion.value).toBeLessThan(0.1);
  });

  it("measures keyboard reliance as the share of keyboard interactions", () => {
    const events = [...times(5, () => modality("keyboard")), modality("pointer")];
    const signals = computeSignals(events, NOW, { completedTasksTotal: 0 });
    expect(signals.keyboardReliance.value).toBeGreaterThan(0.75);
    expect(signals.keyboardReliance.confidence).toBe(1);
  });

  it("treats fast completions as fluency and discounts them by errors", () => {
    const clean = computeSignals(
      times(4, () => fastStep()),
      NOW,
      { completedTasksTotal: 0 },
    );
    const withErrors = computeSignals(
      [...times(4, () => fastStep()), ...times(4, () => fieldError())],
      NOW,
      { completedTasksTotal: 0 },
    );
    expect(clean.fluency.value).toBeGreaterThan(0.6);
    expect(withErrors.fluency.value).toBeLessThan(clean.fluency.value / 1.5);
  });

  it("raises form friction with errors and lowers it with corrections", () => {
    const errors = times(3, () => fieldError());
    const corrected = [
      ...errors,
      ...times(3, () => at(0, { type: "field.corrected", formId: "deploy", fieldId: "replicas" })),
    ];
    const before = computeSignals(errors, NOW, { completedTasksTotal: 0 });
    const after = computeSignals(corrected, NOW, { completedTasksTotal: 0 });
    expect(before.formFriction.value).toBeGreaterThan(0.6);
    expect(after.formFriction.value).toBeLessThan(before.formFriction.value);
    expect(before.formFriction.reasons).toContain("3 errors in deploy.replicas");
  });

  it("raises flow struggle after going back and slow steps", () => {
    const events = [
      at(0, { type: "navigation.back", flowId: "migration", step: 2 }),
      at(0, { type: "step.completed", flowId: "migration", step: 1, durationMs: 90_000 }),
    ];
    const signals = computeSignals(events, NOW, { completedTasksTotal: 0 });
    expect(signals.flowStruggle.value).toBeGreaterThan(0.6);
  });

  it("raises risk caution when irreversible actions are cancelled", () => {
    const events = times(2, () => at(0, { type: "irreversible.cancelled", actionId: "delete" }));
    const signals = computeSignals(events, NOW, { completedTasksTotal: 0 });
    expect(signals.riskCaution.value).toBeGreaterThan(0.6);
  });

  it("derives experience from the lifetime task counter", () => {
    const novice = computeSignals([], NOW, { completedTasksTotal: 0 });
    const veteran = computeSignals([], NOW, { completedTasksTotal: 20 });
    expect(novice.experience.value).toBe(0);
    expect(veteran.experience.value).toBeGreaterThan(0.95);
    expect(veteran.experience.reasons).toEqual(["20 tasks completed"]);
  });

  it("keeps every value and confidence inside [0, 1]", () => {
    const events = [
      ...times(50, () => help()),
      ...times(50, () => fieldError()),
      ...times(50, () => fastStep()),
    ];
    const signals = computeSignals(events, NOW, { completedTasksTotal: 500 });
    for (const key of SIGNAL_KEYS) {
      expect(signals[key].value).toBeGreaterThanOrEqual(0);
      expect(signals[key].value).toBeLessThanOrEqual(1);
      expect(signals[key].confidence).toBeLessThanOrEqual(1);
    }
  });
});
