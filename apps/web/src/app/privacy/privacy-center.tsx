"use client";

import {
  CONSENT_CATEGORIES,
  type ConsentState,
  DEFAULT_RETENTION_MS,
  DEFAULT_STORE_CAPACITY,
  hasAnyConsent,
} from "@aie/engine";
import {
  browserStorage,
  STORAGE_KEY,
  useAdaptiveEngine,
  useConsent,
  useEngineSnapshot,
} from "@aie/react";
import { useEffect, useState } from "react";
import { Commitments } from "@/components/commitments";
import { CONSENT_LABELS } from "@/lib/labels";
import { describeStoredRecord, type StoredRecordView } from "@/lib/stored-record";

function useStoredRecord(revision: number): StoredRecordView {
  const [record, setRecord] = useState<StoredRecordView>({ kind: "empty" });
  useEffect(() => {
    // Re-read whenever the engine changes, so the panel shows exactly what is on disk.
    void revision;
    try {
      setRecord(describeStoredRecord(browserStorage()?.getItem(STORAGE_KEY) ?? null));
    } catch {
      setRecord({ kind: "empty" });
    }
  }, [revision]);
  return record;
}

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PrivacyCenter() {
  const engine = useAdaptiveEngine();
  const snapshot = useEngineSnapshot();
  const { consent, decided, decide, eraseAll } = useConsent();
  const stored = useStoredRecord(snapshot.revision);
  const [erased, setErased] = useState(false);
  const on = hasAnyConsent(consent);

  const change = (partial: Partial<ConsentState>) => {
    setErased(false);
    // Changing a setting here counts as answering the consent prompt.
    decide(partial);
  };

  return (
    <div className="space-y-12">
      <section aria-labelledby="observe-title">
        <h2 id="observe-title" className="text-xl font-bold">
          What the engine may observe
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink-muted">
          Each kind of observation can be switched on or off. Turning one off deletes what was
          observed in that category at once, along with any adaptation based on it.
        </p>
        <fieldset className="mt-5 space-y-3">
          <legend className="sr-only">Observation categories</legend>
          {CONSENT_CATEGORIES.map((category) => (
            <label
              key={category}
              className="flex max-w-2xl items-start gap-3 rounded-md border border-line bg-surface px-4 py-3"
            >
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--engine)]"
                checked={consent[category]}
                onChange={(e) => change({ [category]: e.target.checked })}
              />
              <span>
                <span className="font-semibold">{CONSENT_LABELS[category].label}</span>
                <span className="block text-ink-muted">{CONSENT_LABELS[category].description}</span>
              </span>
            </label>
          ))}
          <label className="flex max-w-2xl items-start gap-3 rounded-md border border-line bg-surface px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-[var(--engine)]"
              checked={consent.remember}
              onChange={(e) => change({ remember: e.target.checked })}
            />
            <span>
              <span className="font-semibold">Remember my familiarity with this workspace</span>
              <span className="block text-ink-muted">
                Stores how many tasks you have completed, so instructions stay short on your next
                visit. Only the number is stored, on this device.
              </span>
            </span>
          </label>
        </fieldset>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!on}
            onClick={() => engine.setPaused(!snapshot.paused)}
            className="rounded-md border border-ink px-4 py-2 font-semibold hover:bg-sunken disabled:opacity-40"
          >
            {snapshot.paused ? "Resume adapting" : "Pause adapting"}
          </button>
          {decided === false && (
            <button
              type="button"
              onClick={() =>
                change({ interaction: true, forms: true, timing: true, modality: true })
              }
              className="rounded-md bg-ink px-4 py-2 font-semibold text-paper hover:opacity-90"
            >
              Allow everything above
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="data-title">
        <h2 id="data-title" className="text-xl font-bold">
          Your data
        </h2>
        <dl className="mt-4 grid max-w-2xl gap-x-8 gap-y-3 sm:grid-cols-[14rem_1fr]">
          <dt className="font-semibold">In memory now</dt>
          <dd className="text-ink-muted">
            {snapshot.events.length} events. Each is forgotten after {DEFAULT_RETENTION_MS / 60_000}{" "}
            minutes, and never more than {DEFAULT_STORE_CAPACITY} are kept.
          </dd>
          <dt className="font-semibold">Stored on this device</dt>
          <dd className="min-w-0">
            {stored.kind === "json" && (
              <pre className="overflow-x-auto rounded-md bg-sunken p-3 font-mono text-xs">
                {stored.text}
              </pre>
            )}
            {stored.kind === "unreadable" && (
              <p className="text-caution">
                A stored record exists but can't be read, so it is ignored. Delete everything to
                remove it.
              </p>
            )}
            {stored.kind === "empty" && (
              <span className="text-ink-muted">
                Nothing. Choices are saved only after you make one.
              </span>
            )}
          </dd>
          <dt className="font-semibold">Sent to a server</dt>
          <dd className="text-ink-muted">
            Nothing the engine observes. If the optional AI rewording is enabled and you use it,
            only the topic and the explanation level are sent.
          </dd>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => download("adaptive-interface-data.json", engine.exportData())}
            className="rounded-md border border-ink px-4 py-2 font-semibold hover:bg-sunken"
          >
            Download my data
          </button>
          <button
            type="button"
            onClick={() => {
              eraseAll();
              setErased(true);
            }}
            className="rounded-md bg-danger px-4 py-2 font-semibold text-white dark:text-sunken"
          >
            Delete everything
          </button>
        </div>
        {erased && (
          <p role="status" className="mt-3 font-semibold">
            Deleted. Nothing is observed or stored until you choose again.
          </p>
        )}
      </section>

      <section aria-labelledby="never-title">
        <h2 id="never-title" className="text-xl font-bold">
          What it will never do
        </h2>
        <div className="mt-5">
          <Commitments />
        </div>
      </section>
    </div>
  );
}
