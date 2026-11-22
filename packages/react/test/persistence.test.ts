import { DEFAULT_CONSENT } from "@aie/engine";
import { describe, expect, it } from "vitest";
import {
  clearPersisted,
  DEFAULT_PERSISTED,
  loadPersisted,
  STORAGE_KEY,
  savePersisted,
} from "../src/persistence";
import { ALL_CONSENT, MemoryStorage, ThrowingStorage } from "./helpers";

describe("persistence", () => {
  it("round-trips choices", () => {
    const storage = new MemoryStorage();
    const state = {
      consent: { ...ALL_CONSENT, remember: true },
      decided: true,
      overrides: { navigation: "keyboard" as const },
      completedTasksTotal: 7,
    };
    savePersisted(storage, state);
    expect(loadPersisted(storage)).toEqual(state);
  });

  it("never stores the task counter unless the person asked to be remembered", () => {
    const storage = new MemoryStorage();
    savePersisted(storage, { ...DEFAULT_PERSISTED, consent: ALL_CONSENT, completedTasksTotal: 7 });
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}").completedTasksTotal).toBe(0);
    expect(loadPersisted(storage).completedTasksTotal).toBe(0);
  });

  it("falls back to defaults when storage is missing, throws or holds garbage", () => {
    expect(loadPersisted(null)).toEqual(DEFAULT_PERSISTED);
    expect(loadPersisted(new ThrowingStorage())).toEqual(DEFAULT_PERSISTED);
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    expect(loadPersisted(storage)).toEqual(DEFAULT_PERSISTED);
    storage.setItem(STORAGE_KEY, JSON.stringify({ consent: "yes", completedTasksTotal: -4 }));
    expect(loadPersisted(storage)).toEqual(DEFAULT_PERSISTED);
  });

  it("keeps the valid parts of a partially corrupted record", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        consent: { forms: true, timing: "maybe" },
        decided: true,
        overrides: { navigation: "keyboard", confirmation: "none", color: "red" },
      }),
    );
    expect(loadPersisted(storage)).toEqual({
      consent: { ...DEFAULT_CONSENT, forms: true },
      decided: true,
      overrides: { navigation: "keyboard" },
      completedTasksTotal: 0,
    });
  });

  it("does not throw when saving or clearing fails", () => {
    expect(() => savePersisted(new ThrowingStorage(), DEFAULT_PERSISTED)).not.toThrow();
    expect(() => clearPersisted(null)).not.toThrow();
  });
});
