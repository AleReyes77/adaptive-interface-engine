import { type AdaptiveEngine, createAdaptiveEngine, type ProfilePatch } from "@aie/engine";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useAdaptiveFlow } from "../src/behaviors/useAdaptiveFlow";
import { useFieldAssist } from "../src/behaviors/useFieldAssist";
import { useIrreversibleConfirmation } from "../src/behaviors/useIrreversibleConfirmation";
import { useTaskTimer } from "../src/behaviors/useTaskTimer";
import { AdaptiveProvider } from "../src/provider";
import { ALL_CONSENT } from "./helpers";

function setup(overrides: ProfilePatch = {}) {
  const engine = createAdaptiveEngine({ consent: ALL_CONSENT, overrides });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AdaptiveProvider engine={engine} storage={null}>
      {children}
    </AdaptiveProvider>
  );
  return { engine, wrapper };
}

const types = (engine: AdaptiveEngine) => engine.getSnapshot().events.map((e) => e.type);

describe("useIrreversibleConfirmation", () => {
  const props = { actionId: "delete-cluster", resourceName: "orbital-prod-eu" };

  it("asks for nothing extra at the standard level", () => {
    const { engine, wrapper } = setup({ confirmation: "standard" });
    const { result } = renderHook(() => useIrreversibleConfirmation(props), { wrapper });
    act(() => result.current.request());
    expect(result.current.canConfirm).toBe(true);
    let confirmed = false;
    act(() => {
      confirmed = result.current.confirm();
    });
    expect(confirmed).toBe(true);
    expect(types(engine)).toEqual(["irreversible.requested", "irreversible.confirmed"]);
  });

  it("requires an explicit acknowledgement at the elevated level", () => {
    const { wrapper } = setup({ confirmation: "elevated" });
    const { result } = renderHook(() => useIrreversibleConfirmation(props), { wrapper });
    act(() => result.current.request());
    expect(result.current.requiresAcknowledgement).toBe(true);
    expect(result.current.canConfirm).toBe(false);
    act(() => result.current.setAcknowledged(true));
    expect(result.current.canConfirm).toBe(true);
  });

  it("requires the exact resource name at the strict level", () => {
    const { wrapper } = setup({ confirmation: "strict" });
    const { result } = renderHook(() => useIrreversibleConfirmation(props), { wrapper });
    act(() => result.current.request());
    act(() => result.current.setTyped("orbital-prod"));
    expect(result.current.canConfirm).toBe(false);
    let confirmed = true;
    act(() => {
      confirmed = result.current.confirm();
    });
    expect(confirmed).toBe(false);
    act(() => result.current.setTyped("orbital-prod-eu"));
    expect(result.current.canConfirm).toBe(true);
  });

  it("locks the level for the dialog that is already open", () => {
    const { engine, wrapper } = setup({ confirmation: "standard" });
    const { result } = renderHook(() => useIrreversibleConfirmation(props), { wrapper });
    act(() => result.current.request());
    act(() => engine.setOverride("confirmation", "strict"));
    expect(result.current.level).toBe("standard");
    act(() => result.current.cancel());
    expect(types(engine)).toContain("irreversible.cancelled");
    act(() => result.current.request());
    expect(result.current.level).toBe("strict");
  });
});

describe("useFieldAssist", () => {
  const props = { formId: "deploy", fieldId: "replicas" };

  it("shows help only next to invalid fields by default", () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useFieldAssist(props), { wrapper });
    expect(result.current.showHelp(false)).toBe(false);
    expect(result.current.showHelp(true)).toBe(true);
  });

  it("shows help on every field when assistance is proactive", () => {
    const { wrapper } = setup({ contextualHelp: "proactive" });
    const { result } = renderHook(() => useFieldAssist(props), { wrapper });
    expect(result.current.showHelp(false)).toBe(true);
  });

  it("reports a correction only after an error", () => {
    const { engine, wrapper } = setup();
    const { result } = renderHook(() => useFieldAssist(props), { wrapper });
    act(() => result.current.reportCorrected());
    expect(types(engine)).toEqual([]);
    act(() => result.current.reportError("range"));
    act(() => result.current.reportCorrected());
    expect(types(engine)).toEqual(["field.error", "field.corrected"]);
  });
});

describe("useAdaptiveFlow", () => {
  it("moves through steps and reports completions and back-navigation", () => {
    const { engine, wrapper } = setup({ flowLayout: "stepped" });
    const { result } = renderHook(() => useAdaptiveFlow({ flowId: "migration", stepCount: 3 }), {
      wrapper,
    });
    expect(result.current.layout).toBe("stepped");
    expect(result.current.isFirst).toBe(true);
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.isLast).toBe(true);
    act(() => result.current.next());
    expect(result.current.step).toBe(2);
    act(() => result.current.back());
    expect(result.current.step).toBe(1);
    expect(types(engine)).toEqual(["step.completed", "step.completed", "navigation.back"]);
  });
});

describe("useTaskTimer", () => {
  it("reports how long a task took", () => {
    const { engine, wrapper } = setup();
    const { result } = renderHook(() => useTaskTimer("deploy"), { wrapper });
    act(() => result.current.start());
    act(() => result.current.complete());
    expect(types(engine)).toEqual(["task.started", "task.completed"]);
    expect(engine.getSnapshot().completedTasksTotal).toBe(1);
  });
});
