"use client";

import type { DimensionValue } from "@aie/engine";
import { useCallback, useRef, useState } from "react";
import { useDimension, useTrack } from "../hooks";

export interface AdaptiveFlowOptions {
  readonly flowId: string;
  readonly stepCount: number;
}

export interface AdaptiveFlow {
  /** `single`: show every section at once. `stepped`: show one step at a time. */
  readonly layout: DimensionValue<"flowLayout">;
  readonly step: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  next(): void;
  back(): void;
  /** Returns to an earlier step (forward jumps are ignored: steps must be completed in order). */
  goTo(step: number): void;
  reset(): void;
}

/** Headless logic for a multi-step process that reports how each step went. */
export function useAdaptiveFlow({ flowId, stepCount }: AdaptiveFlowOptions): AdaptiveFlow {
  const layout = useDimension("flowLayout");
  const track = useTrack();
  const [step, setStep] = useState(0);
  const stepStartedAt = useRef(Date.now());

  const next = useCallback(() => {
    if (step >= stepCount - 1) return;
    const now = Date.now();
    track({ type: "step.completed", flowId, step, durationMs: now - stepStartedAt.current });
    stepStartedAt.current = now;
    setStep(step + 1);
  }, [step, stepCount, track, flowId]);

  const back = useCallback(() => {
    if (step === 0) return;
    track({ type: "navigation.back", flowId, step });
    stepStartedAt.current = Date.now();
    setStep(step - 1);
  }, [step, track, flowId]);

  const goTo = useCallback(
    (target: number) => {
      if (target < 0 || target >= step) return;
      track({ type: "navigation.back", flowId, step });
      stepStartedAt.current = Date.now();
      setStep(target);
    },
    [step, track, flowId],
  );

  const reset = useCallback(() => {
    stepStartedAt.current = Date.now();
    setStep(0);
  }, []);

  return {
    layout,
    step,
    isFirst: step === 0,
    isLast: step === stepCount - 1,
    next,
    back,
    goTo,
    reset,
  };
}
