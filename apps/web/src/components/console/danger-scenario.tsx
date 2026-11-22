"use client";

import { useIrreversibleConfirmation } from "@aie/react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/adaptive/confirm-dialog";
import { Explanation } from "@/components/adaptive/explanation";
import { valueLabel } from "@/lib/labels";

const CLUSTER = "orbital-prod-eu";

const CONSEQUENCES = [
  "Stop the checkout, payments and ledger services",
  "Erase 1.2 TB of data on the cluster's volumes",
  "Remove 14 alert rules that watch this cluster",
  "Keep backups for 7 days, but the cluster itself can't be restored",
];

export function DangerScenario() {
  const confirmation = useIrreversibleConfirmation({
    actionId: "decommission-cluster",
    resourceName: CLUSTER,
  });
  const [done, setDone] = useState(false);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold">Danger zone</h2>
        <p className="mt-1 text-ink-muted">Actions here can't be undone.</p>
      </header>

      <div className="ps-4">
        <Explanation topicId="decommission" />
      </div>

      <section
        aria-labelledby="decommission-title"
        className="rounded-lg border-2 border-danger/60 bg-danger-soft/40 p-5"
      >
        {done ? (
          <div role="status">
            <h3 id="decommission-title" className="text-lg font-bold">
              {CLUSTER} is scheduled for decommission
            </h3>
            <p className="mt-1">This is a simulation: nothing was deleted.</p>
            <button
              type="button"
              className="mt-4 rounded-md border border-ink px-4 py-2 font-semibold hover:bg-sunken"
              onClick={() => setDone(false)}
            >
              Restore the demo cluster
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 id="decommission-title" className="text-lg font-bold">
                Decommission <span className="font-mono">{CLUSTER}</span>
              </h3>
              <p className="mt-1 text-ink-muted">
                Confirmation right now: {valueLabel("confirmation", confirmation.level)}
              </p>
            </div>
            <button
              type="button"
              onClick={confirmation.request}
              className="rounded-md bg-danger px-4 py-2 font-semibold text-white dark:text-sunken"
            >
              Decommission cluster
            </button>
          </div>
        )}
      </section>

      <ConfirmDialog
        confirmation={confirmation}
        title={`Decommission ${CLUSTER}?`}
        resourceName={CLUSTER}
        consequences={CONSEQUENCES}
        actionLabel="Decommission cluster"
        onConfirmed={() => setDone(true)}
      />
    </div>
  );
}
