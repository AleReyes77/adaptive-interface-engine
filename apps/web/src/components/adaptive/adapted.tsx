"use client";

import { DEFAULT_PROFILE, type Dimension } from "@aie/engine";
import { useAdaptiveEngine, useDecision } from "@aie/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DIMENSION_LABELS, valueLabel } from "@/lib/labels";

interface AdaptedProps {
  readonly dimension: Dimension;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Marks a region the engine may adapt. When it is adapted, a violet notch appears in the margin
 * and a disclosure explains why, with a one-click way to keep the standard version.
 */
export function Adapted({ dimension, children, className }: AdaptedProps) {
  const decision = useDecision(dimension);
  const engine = useAdaptiveEngine();
  const active = decision.source !== "default";

  return (
    <div
      className={cn(active && "adapted", className)}
      data-adapted={active ? dimension : undefined}
    >
      <div key={decision.value} className={active ? "adapt-swap" : undefined}>
        {children}
      </div>
      {active && (
        <details className="group mt-3 text-sm">
          <summary className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded text-engine marker:content-none hover:underline">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="size-3.5 transition-transform group-open:rotate-90"
            >
              <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            Why this looks different
          </summary>
          <div className="mt-2 max-w-prose rounded-md border border-engine/30 bg-engine-soft px-3 py-2.5 text-ink">
            <p>{decision.reason}</p>
            <p className="mt-1.5 text-ink-muted">
              {DIMENSION_LABELS[dimension]}: {valueLabel(dimension, decision.value)}
              {decision.source === "rule" && decision.ruleId ? ` (rule ${decision.ruleId})` : ""}
            </p>
            <button
              type="button"
              className="mt-2 font-semibold text-engine underline-offset-2 hover:underline"
              onClick={() =>
                engine.setOverride(
                  dimension,
                  decision.source === "override" ? null : DEFAULT_PROFILE[dimension],
                )
              }
            >
              {decision.source === "override"
                ? "Let the engine decide again"
                : "Keep the standard version"}
            </button>
          </div>
        </details>
      )}
    </div>
  );
}
