"use client";

import { type IrreversibleConfirmation, useDecision } from "@aie/react";
import { type ReactNode, useEffect, useId, useRef } from "react";

interface ConfirmDialogProps {
  readonly confirmation: IrreversibleConfirmation;
  readonly title: string;
  readonly resourceName: string;
  readonly consequences: readonly string[];
  readonly actionLabel: string;
  readonly children?: ReactNode;
  onConfirmed(): void;
}

/**
 * The confirmation for an irreversible action, built on a native modal <dialog> so focus is
 * trapped and Escape cancels. Its requirements follow the level locked when it opened.
 */
export function ConfirmDialog({
  confirmation,
  title,
  resourceName,
  consequences,
  actionLabel,
  children,
  onConfirmed,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const decision = useDecision("confirmation");
  const { isOpen, level } = confirmation;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      onCancel={(event) => {
        event.preventDefault();
        confirmation.cancel();
      }}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      <form
        method="dialog"
        className="p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (confirmation.confirm()) onConfirmed();
        }}
      >
        <h2 id={`${id}-title`} className="text-xl font-bold">
          {title}
        </h2>
        <div id={`${id}-body`} className="mt-3 space-y-3">
          {level === "standard" ? (
            <p>This can't be undone.</p>
          ) : (
            <>
              <p className="font-semibold">This can't be undone. It will:</p>
              <ul className="list-disc space-y-1 ps-5">
                {consequences.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          )}
          {children}
        </div>

        {level !== "standard" && decision.source !== "default" && (
          <p className="mt-4 rounded-md bg-engine-soft px-3 py-2 text-sm">{decision.reason}</p>
        )}

        {confirmation.requiresAcknowledgement && (
          <label className="mt-5 flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-danger"
              checked={confirmation.acknowledged}
              onChange={(e) => confirmation.setAcknowledged(e.target.checked)}
            />
            <span>I understand that {resourceName} and its data can't be restored.</span>
          </label>
        )}

        {confirmation.requiresTypedName && (
          <div className="mt-5">
            <label htmlFor={`${id}-name`} className="block font-semibold">
              Type <span className="font-mono">{resourceName}</span> to confirm
            </label>
            <input
              id={`${id}-name`}
              autoComplete="off"
              spellCheck={false}
              value={confirmation.typed}
              onChange={(e) => confirmation.setTyped(e.target.value)}
              className="mt-2 w-full rounded-md border border-line-strong bg-paper px-3 py-2 font-mono"
            />
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-line-strong px-4 py-2 font-semibold hover:bg-sunken"
            onClick={() => confirmation.cancel()}
          >
            Keep {resourceName}
          </button>
          <button
            type="submit"
            disabled={!confirmation.canConfirm}
            className="rounded-md bg-danger px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 dark:text-sunken"
          >
            {actionLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
