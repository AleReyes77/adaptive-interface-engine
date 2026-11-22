"use client";

import type { DimensionValue } from "@aie/engine";
import { useCallback, useMemo, useRef } from "react";
import { useDimension, useTrack } from "../hooks";

export interface FieldAssistOptions {
  readonly formId: string;
  readonly fieldId: string;
}

export interface FieldAssist {
  readonly mode: DimensionValue<"contextualHelp">;
  /** Whether contextual help should be visible for this field right now. */
  showHelp(hasError: boolean): boolean;
  /** Report a validation error. `code` is a machine id such as `range`, never the value. */
  reportError(code: string): void;
  /** Report that a previously invalid value is now valid. */
  reportCorrected(): void;
}

/** Headless logic for a form field whose help adapts to how the form is going. */
export function useFieldAssist({ formId, fieldId }: FieldAssistOptions): FieldAssist {
  const mode = useDimension("contextualHelp");
  const track = useTrack();
  const hadError = useRef(false);

  const showHelp = useCallback(
    (hasError: boolean) => mode === "proactive" || (mode === "onError" && hasError),
    [mode],
  );

  const reportError = useCallback(
    (code: string) => {
      hadError.current = true;
      track({ type: "field.error", formId, fieldId, code });
    },
    [track, formId, fieldId],
  );

  const reportCorrected = useCallback(() => {
    if (!hadError.current) return;
    hadError.current = false;
    track({ type: "field.corrected", formId, fieldId });
  }, [track, formId, fieldId]);

  return useMemo(
    () => ({ mode, showHelp, reportError, reportCorrected }),
    [mode, showHelp, reportError, reportCorrected],
  );
}
