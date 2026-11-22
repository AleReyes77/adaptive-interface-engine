"use client";

import type { FieldAssist } from "@aie/react";
import { type InputHTMLAttributes, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Adapted } from "./adapted";

interface AssistedFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  /** From `useFieldAssist`, owned by the form so it can report validation results. */
  readonly assist: FieldAssist;
  readonly label: string;
  readonly help: string;
  /** The current error message, if the value is invalid. */
  readonly error: string | null;
}

/**
 * A form field whose help follows the `contextualHelp` dimension: on request, after an error,
 * or always. The form validates and reports errors; this component presents them.
 */
export function AssistedField({
  assist,
  label,
  help,
  error,
  className,
  ...input
}: AssistedFieldProps) {
  const id = useId();
  const [asked, setAsked] = useState(false);
  const showHelp = asked || assist.showHelp(error !== null);
  const describedBy = [error && `${id}-error`, showHelp && `${id}-help`].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        {!assist.showHelp(error !== null) && (
          <button
            type="button"
            aria-expanded={asked}
            aria-controls={`${id}-help`}
            className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
            onClick={() => setAsked(!asked)}
          >
            {asked ? "Hide help" : "Help"}
          </button>
        )}
      </div>
      <input
        id={id}
        aria-invalid={error !== null}
        aria-describedby={describedBy || undefined}
        className={cn(
          "mt-1.5 w-full rounded-md border bg-surface px-3 py-2",
          error ? "border-danger" : "border-line-strong",
        )}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      {showHelp &&
        (asked ? (
          <p id={`${id}-help`} className="mt-1.5 max-w-prose text-sm text-ink-muted">
            {help}
          </p>
        ) : (
          <Adapted dimension="contextualHelp" className="mt-1.5">
            <p id={`${id}-help`} className="max-w-prose text-sm text-ink-muted">
              {help}
            </p>
          </Adapted>
        ))}
    </div>
  );
}
