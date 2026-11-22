"use client";

import { useConsent } from "@aie/react";
import Link from "next/link";

const ALLOW_ALL = { interaction: true, forms: true, timing: true, modality: true };
const ALLOW_NONE = { interaction: false, forms: false, timing: false, modality: false };

/**
 * Asks once whether the interface may adapt. Both answers carry the same visual weight,
 * and nothing is observed or stored before an answer.
 */
export function ConsentBanner() {
  const { decided, decide } = useConsent();
  if (decided !== false) return null;

  return (
    <section
      aria-labelledby="consent-title"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface shadow-[0_-8px_24px_rgb(24_33_43/0.08)]"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:gap-10">
        <div className="max-w-2xl">
          <h2 id="consent-title" className="font-bold">
            Let this interface adapt to how you use it?
          </h2>
          <p className="mt-1 text-ink-muted">
            It notices things like opening help, form errors and keyboard use, and adjusts
            explanations and help to match. What it notices stays in this tab and is forgotten after
            20 minutes. It never records what you type, and never guesses who you are.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:ms-auto">
          <button
            type="button"
            onClick={() => decide(ALLOW_ALL)}
            className="rounded-md bg-ink px-4 py-2 font-semibold text-paper hover:opacity-90"
          >
            Allow on this device
          </button>
          <button
            type="button"
            onClick={() => decide(ALLOW_NONE)}
            className="rounded-md border border-ink px-4 py-2 font-semibold hover:bg-sunken"
          >
            Keep it standard
          </button>
          <Link href="/privacy" className="px-1 font-semibold underline underline-offset-4">
            Choose what it can see
          </Link>
        </div>
      </div>
    </section>
  );
}
