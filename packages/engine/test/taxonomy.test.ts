import { describe, expect, it } from "vitest";
import { EVENT_CATEGORY, MAX_DURATION_MS, sanitizeEvent } from "../src/events/taxonomy";

describe("sanitizeEvent", () => {
  it("accepts a well-formed event unchanged", () => {
    const event = { type: "field.error", formId: "deploy", fieldId: "replicas", code: "range" };
    expect(sanitizeEvent(event)).toEqual(event);
  });

  it("strips keys that are not part of the event schema", () => {
    const result = sanitizeEvent({
      type: "help.opened",
      topicId: "load-balancer",
      value: "secret",
    });
    expect(result).toEqual({ type: "help.opened", topicId: "load-balancer" });
  });

  it("rejects identifiers that look like user-entered values", () => {
    expect(
      sanitizeEvent({ type: "field.error", formId: "signup", fieldId: "ana@mail.com", code: "x" }),
    ).toBeNull();
    expect(sanitizeEvent({ type: "help.opened", topicId: "Ana Lopez" })).toBeNull();
  });

  it("rejects unknown event types and non-objects", () => {
    expect(sanitizeEvent({ type: "mouse.moved", x: 1 })).toBeNull();
    expect(sanitizeEvent("help.opened")).toBeNull();
    expect(sanitizeEvent(null)).toBeNull();
  });

  it("clamps durations into a sane range", () => {
    expect(
      sanitizeEvent({ type: "task.completed", taskId: "deploy", durationMs: 1e12 }),
    ).toMatchObject({ durationMs: MAX_DURATION_MS });
    expect(sanitizeEvent({ type: "hesitation", context: "deploy", durationMs: -50 })).toMatchObject(
      { durationMs: 0 },
    );
  });

  it("rejects an invalid input modality", () => {
    expect(sanitizeEvent({ type: "input.modality", modality: "eye-tracking" })).toBeNull();
  });
});

describe("EVENT_CATEGORY", () => {
  it("maps every event type to a consent category", () => {
    expect(EVENT_CATEGORY["field.error"]).toBe("forms");
    expect(EVENT_CATEGORY["input.modality"]).toBe("modality");
    expect(EVENT_CATEGORY["step.completed"]).toBe("timing");
    expect(EVENT_CATEGORY["help.opened"]).toBe("interaction");
    expect(EVENT_CATEGORY["irreversible.requested"]).toBe("interaction");
  });
});
