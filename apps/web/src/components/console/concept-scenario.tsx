"use client";

import { useTaskTimer } from "@aie/react";
import { useEffect, useState } from "react";
import { Explanation } from "@/components/adaptive/explanation";
import { Instructions } from "@/components/adaptive/instructions";
import { cn } from "@/lib/cn";

const ZONES = [
  { name: "eu-west-1a", role: "Leader", status: "Healthy", lag: "0 s" },
  { name: "eu-west-1b", role: "Follower", status: "Healthy", lag: "0.2 s" },
  { name: "eu-west-1c", role: "Follower", status: "Degraded", lag: "12 s behind" },
] as const;

export function ConceptScenario() {
  const timer = useTaskTimer("understand-replication");
  const [done, setDone] = useState(false);

  useEffect(() => {
    timer.start();
  }, [timer]);

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-2xl font-bold">Cluster orbital-prod-eu</h2>
        <p className="mt-1 text-ink-muted">Three zones hold a copy of every record.</p>
      </header>

      <section aria-labelledby="zones-title">
        <h3 id="zones-title" className="font-bold">
          Zone health
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse">
            <thead>
              <tr className="border-b-2 border-ink text-start text-sm">
                <th scope="col" className="py-2 pe-4 text-start">
                  Zone
                </th>
                <th scope="col" className="py-2 pe-4 text-start">
                  Role
                </th>
                <th scope="col" className="py-2 pe-4 text-start">
                  Status
                </th>
                <th scope="col" className="py-2 text-start">
                  Replication
                </th>
              </tr>
            </thead>
            <tbody>
              {ZONES.map((zone) => (
                <tr key={zone.name} className="border-b border-line">
                  <th scope="row" className="py-2.5 pe-4 text-start font-mono font-normal">
                    {zone.name}
                  </th>
                  <td className="py-2.5 pe-4">{zone.role}</td>
                  <td className="py-2.5 pe-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-sm font-semibold",
                        zone.status === "Healthy"
                          ? "bg-ok-soft text-ok"
                          : "bg-caution-soft text-caution",
                      )}
                    >
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                      {zone.status}
                    </span>
                  </td>
                  <td className="py-2.5 tabular-nums">{zone.lag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 ps-4">
          <Instructions
            hint="A degraded zone still holds a copy; it is catching up."
            steps={[
              "Find the zone marked Degraded.",
              "Check how far behind it is. Under 30 seconds is normal while it catches up.",
              "If it stays degraded for more than 10 minutes, open an incident.",
              "No action is needed while two zones are healthy.",
            ]}
          />
        </div>
      </section>

      <div className="grid gap-10 ps-4 xl:grid-cols-2">
        <Explanation topicId="replication" />
        <Explanation topicId="failover" />
      </div>

      <div className="flex items-center gap-4 border-t border-line pt-6">
        <button
          type="button"
          disabled={done}
          onClick={() => {
            timer.complete();
            setDone(true);
          }}
          className="rounded-md bg-ink px-4 py-2 font-semibold text-paper hover:opacity-90 disabled:opacity-50"
        >
          {done ? "Marked as understood" : "I understand how this cluster stays available"}
        </button>
        {done && (
          <button
            type="button"
            className="text-sm text-ink-muted underline underline-offset-4"
            onClick={() => {
              setDone(false);
              timer.start();
            }}
          >
            Review again
          </button>
        )}
      </div>
    </div>
  );
}
