import { createAdaptiveEngine, DEFAULT_PROFILE } from "@aie/engine";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdaptation, useConsent, useDecision, useEngineSnapshot, useTrack } from "../src/hooks";
import { STORAGE_KEY } from "../src/persistence";
import { AdaptiveProvider } from "../src/provider";
import { ALL_CONSENT, MemoryStorage, ThrowingStorage } from "./helpers";

const falseConsent = () => ({
  interaction: false,
  forms: false,
  timing: false,
  modality: false,
  remember: false,
});

function Probe() {
  const profile = useAdaptation();
  return <output data-testid="profile">{JSON.stringify(profile)}</output>;
}

describe("AdaptiveProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the default profile on the server, whatever is stored", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        consent: ALL_CONSENT,
        decided: true,
        overrides: { navigation: "keyboard" },
      }),
    );
    const html = renderToString(
      <AdaptiveProvider storage={storage}>
        <Probe />
      </AdaptiveProvider>,
    );
    expect(html).toContain(JSON.stringify(DEFAULT_PROFILE).replaceAll('"', "&quot;"));
  });

  it("restores stored choices on the client", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        consent: ALL_CONSENT,
        decided: true,
        overrides: { navigation: "keyboard" },
      }),
    );
    render(
      <AdaptiveProvider storage={storage}>
        <Probe />
      </AdaptiveProvider>,
    );
    expect(JSON.parse(screen.getByTestId("profile").textContent ?? "{}").navigation).toBe(
      "keyboard",
    );
  });

  it("uses the consent given in options when nothing is stored", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AdaptiveProvider storage={null} options={{ consent: { interaction: true } }}>
        {children}
      </AdaptiveProvider>
    );
    const { result } = renderHook(() => ({ track: useTrack(), snap: useEngineSnapshot() }), {
      wrapper,
    });
    expect(result.current.snap.consent.interaction).toBe(true);
    act(() => {
      result.current.track({ type: "help.opened", topicId: "topic" });
    });
    expect(result.current.snap.events).toHaveLength(1);
  });

  it("works when storage throws", () => {
    render(
      <AdaptiveProvider storage={new ThrowingStorage()}>
        <Probe />
      </AdaptiveProvider>,
    );
    expect(JSON.parse(screen.getByTestId("profile").textContent ?? "{}")).toEqual(DEFAULT_PROFILE);
  });

  it("switches to keyboard navigation after sustained keyboard use, once consented", () => {
    const storage = new MemoryStorage();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AdaptiveProvider storage={storage}>{children}</AdaptiveProvider>
    );
    const { result } = renderHook(() => ({ consent: useConsent(), profile: useAdaptation() }), {
      wrapper,
    });
    expect(result.current.consent.decided).toBe(false);

    act(() => result.current.consent.decide(ALL_CONSENT));
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(1_500);
        fireEvent.keyDown(window, { key: "Tab" });
      });
    }
    expect(result.current.profile.navigation).toBe("keyboard");
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}").decided).toBe(true);
  });

  it("ignores typing that is not navigation", () => {
    const engine = createAdaptiveEngine({ consent: ALL_CONSENT });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AdaptiveProvider engine={engine} storage={null}>
        {children}
      </AdaptiveProvider>
    );
    renderHook(() => useEngineSnapshot(), { wrapper });
    act(() => {
      fireEvent.keyDown(window, { key: "a" });
    });
    expect(engine.getSnapshot().events).toEqual([]);
  });

  it("exposes tracking and the reason behind each dimension", () => {
    const engine = createAdaptiveEngine({ consent: ALL_CONSENT });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AdaptiveProvider engine={engine} storage={null}>
        {children}
      </AdaptiveProvider>
    );
    const { result } = renderHook(
      () => ({ track: useTrack(), decision: useDecision("explanationLevel") }),
      { wrapper },
    );
    act(() => {
      for (let i = 0; i < 3; i++) result.current.track({ type: "help.opened", topicId: "topic" });
    });
    expect(result.current.decision.ruleId).toBe("simplify-after-confusion");
  });

  it("erases observations, choices and stored data, then asks again", () => {
    const storage = new MemoryStorage();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AdaptiveProvider storage={storage}>{children}</AdaptiveProvider>
    );
    const { result } = renderHook(() => ({ consent: useConsent(), snap: useEngineSnapshot() }), {
      wrapper,
    });
    act(() => result.current.consent.decide({ ...ALL_CONSENT, remember: true }));
    act(() => {
      result.current.consent.update({ forms: false });
    });
    expect(result.current.snap.consent.forms).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();

    act(() => result.current.consent.eraseAll());
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.consent.decided).toBe(false);
    expect(result.current.snap.consent).toEqual({ ...ALL_CONSENT, ...falseConsent() });
    expect(result.current.snap.events).toEqual([]);
  });

  it("throws a helpful error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAdaptation())).toThrow(/AdaptiveProvider/);
  });
});
