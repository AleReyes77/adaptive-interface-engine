"use client";

import { useDimension } from "@aie/react";
import { Adapted } from "./adapted";

interface InstructionsProps {
  /** One line, shown at the standard level. */
  readonly hint: string;
  /** The full procedure, shown step by step at the detailed level. */
  readonly steps: readonly string[];
}

/** Instructions whose density follows the `instructions` dimension. */
export function Instructions({ hint, steps }: InstructionsProps) {
  const level = useDimension("instructions");
  return (
    <Adapted dimension="instructions">
      {level === "detailed" && (
        <ol className="list-decimal space-y-1 ps-5 text-ink-muted marker:font-semibold marker:text-ink">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      {level === "standard" && <p className="text-ink-muted">{hint}</p>}
      {level === "minimal" && <p className="sr-only">{hint}</p>}
    </Adapted>
  );
}
