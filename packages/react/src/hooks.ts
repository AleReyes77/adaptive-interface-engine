"use client";

import {
  type AdaptationProfile,
  type AdaptiveEngine,
  type ConsentState,
  createAdaptiveEngine,
  type Dimension,
  type DimensionDecision,
  type DimensionValue,
  type EngineSnapshot,
} from "@aie/engine";
import { use, useCallback, useSyncExternalStore } from "react";
import { AdaptiveContext, type AdaptiveContextValue } from "./context";

/**
 * The snapshot used for server rendering and hydration: no consent, default profile.
 * Using one constant guarantees the server and the first client render agree.
 */
export const SERVER_SNAPSHOT: EngineSnapshot = createAdaptiveEngine({
  clock: () => 0,
}).getSnapshot();

const getServerSnapshot = () => SERVER_SNAPSHOT;

function useAdaptiveContext(): AdaptiveContextValue {
  const context = use(AdaptiveContext);
  if (!context) throw new Error("Adaptive hooks must be used inside <AdaptiveProvider>.");
  return context;
}

export function useAdaptiveEngine(): AdaptiveEngine {
  return useAdaptiveContext().engine;
}

/** The engine's current snapshot. Re-renders when it changes. */
export function useEngineSnapshot(): EngineSnapshot {
  const engine = useAdaptiveEngine();
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, getServerSnapshot);
}

/** The current adaptation profile. */
export function useAdaptation(): AdaptationProfile {
  return useEngineSnapshot().profile;
}

/** The current value of one dimension. */
export function useDimension<D extends Dimension>(dimension: D): DimensionValue<D> {
  return useAdaptation()[dimension];
}

/** Why a dimension has its current value. */
export function useDecision(dimension: Dimension): DimensionDecision {
  return useEngineSnapshot().decisions[dimension];
}

/** A stable function that reports an interaction event. */
export function useTrack(): (event: unknown) => boolean {
  const engine = useAdaptiveEngine();
  return useCallback((event: unknown) => engine.track(event), [engine]);
}

export interface ConsentApi {
  readonly consent: ConsentState;
  readonly decided: boolean | undefined;
  decide(consent: Partial<ConsentState>): void;
  update(consent: Partial<ConsentState>): void;
  eraseAll(): void;
}

/** The person's consent and the controls to change it. */
export function useConsent(): ConsentApi {
  const { engine, decided, decide, eraseAll } = useAdaptiveContext();
  const { consent } = useEngineSnapshot();
  const update = useCallback(
    (partial: Partial<ConsentState>) => engine.setConsent(partial),
    [engine],
  );
  return { consent, decided, decide, update, eraseAll };
}
