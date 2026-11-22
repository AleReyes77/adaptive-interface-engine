import { describe, expect, it } from "vitest";
import { createEventStore } from "../src/events/store";
import type { TrackedEvent } from "../src/events/taxonomy";
import { DEFAULT_CONSENT, isCategoryAllowed } from "../src/privacy/consent";

const help = (at: number): TrackedEvent => ({ type: "help.opened", topicId: "topic", at });
const fieldError = (at: number): TrackedEvent => ({
  type: "field.error",
  formId: "deploy",
  fieldId: "replicas",
  code: "range",
  at,
});

describe("consent", () => {
  it("allows nothing by default", () => {
    for (const category of ["interaction", "forms", "timing", "modality"] as const) {
      expect(isCategoryAllowed(DEFAULT_CONSENT, category)).toBe(false);
    }
    expect(DEFAULT_CONSENT.remember).toBe(false);
  });

  it("allows exactly the categories that were granted", () => {
    const consent = { ...DEFAULT_CONSENT, forms: true };
    expect(isCategoryAllowed(consent, "forms")).toBe(true);
    expect(isCategoryAllowed(consent, "timing")).toBe(false);
  });
});

describe("createEventStore", () => {
  it("evicts the oldest events when capacity is reached", () => {
    const store = createEventStore({ capacity: 3, retentionMs: 60_000 });
    for (let at = 1; at <= 5; at++) store.add(help(at));
    expect(store.list(5).map((e) => e.at)).toEqual([3, 4, 5]);
  });

  it("drops events older than the retention window", () => {
    const store = createEventStore({ capacity: 10, retentionMs: 1_000 });
    store.add(help(0));
    store.add(help(900));
    expect(store.list(1_500).map((e) => e.at)).toEqual([900]);
  });

  it("purges events matching a predicate", () => {
    const store = createEventStore();
    store.add(help(1));
    store.add(fieldError(2));
    store.purge((event) => event.type === "field.error");
    expect(store.list(2).map((e) => e.type)).toEqual(["help.opened"]);
  });

  it("clears everything", () => {
    const store = createEventStore();
    store.add(help(1));
    store.clear();
    expect(store.list(1)).toEqual([]);
  });

  it("uses a 20 minute retention and 500 event capacity by default", () => {
    const store = createEventStore();
    store.add(help(0));
    expect(store.list(1_200_000)).toHaveLength(1);
    expect(store.list(1_200_001)).toHaveLength(0);
  });
});
