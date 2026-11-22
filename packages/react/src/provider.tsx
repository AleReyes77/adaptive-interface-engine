"use client";

import { type AdaptiveEngine, createAdaptiveEngine, type EngineOptions } from "@aie/engine";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AdaptiveContext, type AdaptiveContextValue } from "./context";
import { installModalityTracking } from "./modality";
import { browserStorage, clearPersisted, loadPersisted, savePersisted } from "./persistence";

export interface AdaptiveProviderProps {
  readonly children: ReactNode;
  /** Engine options (rules, clock, signal tuning). Stored choices take precedence over these. */
  readonly options?: EngineOptions;
  /** Where choices are stored. Defaults to `localStorage`; `null` disables persistence. */
  readonly storage?: Storage | null;
  /** Use an existing engine instead of creating one (tests, multiple roots). */
  readonly engine?: AdaptiveEngine;
  /** How often time-based state (decay, pending relaxations) is re-evaluated. */
  readonly tickMs?: number;
  /** Set to false to stop reporting the input modality. */
  readonly trackModality?: boolean;
}

const subscribeNever = () => () => {};

/** True after hydration; false on the server and during the hydration render. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/**
 * Creates the engine, restores stored choices, reports input modality, keeps time-based state
 * fresh and persists choices. Server rendering and hydration always use the default profile.
 */
export function AdaptiveProvider({
  children,
  options,
  storage: storageProp,
  engine: engineProp,
  tickMs = 5_000,
  trackModality = true,
}: AdaptiveProviderProps) {
  const storage = storageProp === undefined ? browserStorage() : storageProp;
  const [initial] = useState(() => (engineProp ? null : loadPersisted(storage)));
  const [engine] = useState(
    () =>
      engineProp ??
      createAdaptiveEngine({
        ...options,
        // Stored choices win, but only when the person actually made some.
        consent: initial?.decided ? initial.consent : options?.consent,
        overrides: { ...options?.overrides, ...initial?.overrides },
        completedTasksTotal: initial?.decided
          ? initial.completedTasksTotal
          : options?.completedTasksTotal,
      }),
  );
  const [decided, setDecided] = useState(initial?.decided ?? true);
  const hydrated = useHydrated();
  const lastSaved = useRef<string | null>(null);

  // Re-evaluate decaying signals and pending relaxations.
  useEffect(() => {
    const id = setInterval(() => engine.tick(), tickMs);
    return () => clearInterval(id);
  }, [engine, tickMs]);

  useEffect(() => {
    if (!trackModality || typeof window === "undefined") return;
    return installModalityTracking(window, (modality) => {
      engine.track({ type: "input.modality", modality });
    });
  }, [engine, trackModality]);

  // Persist choices, but only once the person has made one.
  useEffect(() => {
    if (!decided || !storage) return;
    const save = () => {
      const { consent, overrides, completedTasksTotal } = engine.getSnapshot();
      const state = { consent, decided, overrides, completedTasksTotal };
      const json = JSON.stringify(state);
      if (json === lastSaved.current) return;
      lastSaved.current = json;
      savePersisted(storage, state);
    };
    save();
    return engine.subscribe(save);
  }, [engine, storage, decided]);

  const decide = useCallback<AdaptiveContextValue["decide"]>(
    (consent) => {
      engine.setConsent(consent);
      setDecided(true);
    },
    [engine],
  );

  const eraseAll = useCallback(() => {
    engine.setConsent({
      interaction: false,
      forms: false,
      timing: false,
      modality: false,
      remember: false,
    });
    engine.clearOverrides();
    engine.setPaused(false);
    engine.forget();
    clearPersisted(storage);
    lastSaved.current = null;
    setDecided(false);
  }, [engine, storage]);

  const value = useMemo<AdaptiveContextValue>(
    () => ({ engine, decided: hydrated ? decided : undefined, decide, eraseAll }),
    [engine, hydrated, decided, decide, eraseAll],
  );

  return <AdaptiveContext value={value}>{children}</AdaptiveContext>;
}
