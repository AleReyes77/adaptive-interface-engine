"use client";

import { useDimension } from "@aie/react";

/** A keyboard shortcut hint, shown only when the interface has adapted to keyboard navigation. */
export function Kbd({ keys, label }: { readonly keys: string; readonly label?: string }) {
  const navigation = useDimension("navigation");
  if (navigation !== "keyboard") return null;
  return (
    <kbd
      aria-label={label ? `Shortcut: ${label}` : `Shortcut ${keys}`}
      className="ms-1.5 inline-flex min-w-5 items-center justify-center rounded border border-line-strong bg-surface px-1 font-mono text-xs leading-5 text-ink-muted"
    >
      {keys}
    </kbd>
  );
}
