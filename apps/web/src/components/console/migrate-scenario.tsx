"use client";

import { useAdaptiveFlow, useTaskTimer } from "@aie/react";
import { type ReactNode, useEffect, useState } from "react";
import { Adapted } from "@/components/adaptive/adapted";
import { Instructions } from "@/components/adaptive/instructions";
import { cn } from "@/lib/cn";

const SOURCES = [
  { id: "orders-db", label: "orders-db", detail: "PostgreSQL 15, EU West, 84 GB" },
  { id: "legacy-billing", label: "legacy-billing", detail: "MySQL 8, US East, 212 GB" },
] as const;

const TABLES = [
  { id: "orders", rows: "41 M rows" },
  { id: "order_items", rows: "163 M rows" },
  { id: "customers", rows: "2.1 M rows" },
  { id: "audit_log", rows: "890 M rows, can be skipped" },
] as const;

interface Plan {
  source: string;
  target: string;
  tier: "standard" | "fast";
  tables: string[];
  indexes: boolean;
  when: "now" | "window";
  readOnly: boolean;
}

const INITIAL: Plan = {
  source: "orders-db",
  target: "orbital-prod-eu",
  tier: "standard",
  tables: ["orders", "order_items", "customers"],
  indexes: true,
  when: "window",
  readOnly: true,
};

interface StepDefinition {
  title: string;
  summary(plan: Plan): string;
  hint: string;
  steps: string[];
  valid(plan: Plan): boolean;
}

const STEPS: StepDefinition[] = [
  {
    title: "Choose the source",
    summary: (p) => p.source,
    hint: "Pick the database you are moving away from.",
    steps: [
      "Pick the database you are moving away from.",
      "Check its size: larger databases take longer to copy.",
    ],
    valid: () => true,
  },
  {
    title: "Choose the target",
    summary: (p) => `${p.target}, ${p.tier} storage`,
    hint: "Pick where the data goes and how fast its storage should be.",
    steps: [
      "Pick the cluster that will hold the data.",
      "Choose Fast storage only if the source is under heavy load; it costs more.",
    ],
    valid: () => true,
  },
  {
    title: "Choose what to copy",
    summary: (p) => `${p.tables.length} tables${p.indexes ? ", with indexes" : ""}`,
    hint: "Select at least one table. Skipping large logs shortens the copy.",
    steps: [
      "Select every table your application reads.",
      "Leave out audit_log if you archive it elsewhere: it is most of the data.",
      "Keep Copy indexes on, or queries will be slow until they are rebuilt.",
    ],
    valid: (p) => p.tables.length > 0,
  },
  {
    title: "Schedule it",
    summary: (p) => (p.when === "now" ? "Start now" : "Next maintenance window"),
    hint: "A maintenance window avoids slowing down live traffic.",
    steps: [
      "Choose the next maintenance window unless this is urgent.",
      "Keep the source read-only during the copy, so no change is lost.",
      "Select Start migration. You can cancel until the copy begins.",
    ],
    valid: () => true,
  },
];

function Choice({
  checked,
  children,
  ...input
}: { checked: boolean; children: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5",
        checked ? "border-ink bg-sunken" : "border-line hover:border-line-strong",
      )}
    >
      <input className="mt-1 size-4 accent-[var(--ink)]" checked={checked} {...input} />
      <span>{children}</span>
    </label>
  );
}

function StepFields({
  index,
  plan,
  set,
}: {
  index: number;
  plan: Plan;
  set(p: Partial<Plan>): void;
}) {
  switch (index) {
    case 0:
      return (
        <fieldset className="space-y-2">
          <legend className="sr-only">Source database</legend>
          {SOURCES.map((s) => (
            <Choice
              key={s.id}
              type="radio"
              name="source"
              checked={plan.source === s.id}
              onChange={() => set({ source: s.id })}
            >
              <span className="font-mono">{s.label}</span>
              <span className="block text-sm text-ink-muted">{s.detail}</span>
            </Choice>
          ))}
        </fieldset>
      );
    case 1:
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="target" className="font-semibold">
              Target cluster
            </label>
            <select
              id="target"
              value={plan.target}
              onChange={(e) => set({ target: e.target.value })}
              className="mt-1.5 block w-full rounded-md border border-line-strong bg-surface px-3 py-2 font-mono"
            >
              <option value="orbital-prod-eu">orbital-prod-eu</option>
              <option value="orbital-staging-eu">orbital-staging-eu</option>
            </select>
          </div>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">Storage</legend>
            <Choice
              type="radio"
              name="tier"
              checked={plan.tier === "standard"}
              onChange={() => set({ tier: "standard" })}
            >
              Standard
              <span className="block text-sm text-ink-muted">Right for most databases</span>
            </Choice>
            <Choice
              type="radio"
              name="tier"
              checked={plan.tier === "fast"}
              onChange={() => set({ tier: "fast" })}
            >
              Fast
              <span className="block text-sm text-ink-muted">For heavy write load, costs more</span>
            </Choice>
          </fieldset>
        </div>
      );
    case 2:
      return (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="mb-2 font-semibold">Tables</legend>
            {TABLES.map((t) => (
              <Choice
                key={t.id}
                type="checkbox"
                checked={plan.tables.includes(t.id)}
                onChange={(e) =>
                  set({
                    tables: e.target.checked
                      ? [...plan.tables, t.id]
                      : plan.tables.filter((x) => x !== t.id),
                  })
                }
              >
                <span className="font-mono">{t.id}</span>
                <span className="block text-sm text-ink-muted">{t.rows}</span>
              </Choice>
            ))}
          </fieldset>
          <Choice
            type="checkbox"
            checked={plan.indexes}
            onChange={(e) => set({ indexes: e.target.checked })}
          >
            Copy indexes
          </Choice>
          {plan.tables.length === 0 && (
            <p role="alert" className="text-sm font-semibold text-danger">
              Select at least one table to copy.
            </p>
          )}
        </div>
      );
    default:
      return (
        <div className="space-y-4">
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">When</legend>
            <Choice
              type="radio"
              name="when"
              checked={plan.when === "window"}
              onChange={() => set({ when: "window" })}
            >
              Next maintenance window
              <span className="block text-sm text-ink-muted">Sunday 02:00 UTC</span>
            </Choice>
            <Choice
              type="radio"
              name="when"
              checked={plan.when === "now"}
              onChange={() => set({ when: "now" })}
            >
              Start now
              <span className="block text-sm text-ink-muted">May slow down live traffic</span>
            </Choice>
          </fieldset>
          <Choice
            type="checkbox"
            checked={plan.readOnly}
            onChange={(e) => set({ readOnly: e.target.checked })}
          >
            Keep the source read-only during the copy
          </Choice>
        </div>
      );
  }
}

export function MigrateScenario() {
  const flow = useAdaptiveFlow({ flowId: "migration", stepCount: STEPS.length });
  const timer = useTaskTimer("migration");
  const [plan, setPlan] = useState<Plan>(INITIAL);
  const [started, setStarted] = useState(false);
  const set = (p: Partial<Plan>) => setPlan((current) => ({ ...current, ...p }));
  const current = STEPS[flow.step] ?? STEPS[0];
  const stepped = flow.layout === "stepped";

  useEffect(() => {
    timer.start();
  }, [timer]);

  if (started) {
    return (
      <div role="status" className="space-y-4">
        <h2 className="text-2xl font-bold">Migration scheduled</h2>
        <p>
          <span className="font-mono">{plan.source}</span> will be copied to{" "}
          <span className="font-mono">{plan.target}</span>{" "}
          {plan.when === "now" ? "starting now" : "in the next maintenance window"}. This is a
          simulation: nothing was copied.
        </p>
        <button
          type="button"
          className="rounded-md border border-ink px-4 py-2 font-semibold hover:bg-sunken"
          onClick={() => {
            setStarted(false);
            setPlan(INITIAL);
            flow.reset();
            timer.start();
          }}
        >
          Plan another migration
        </button>
      </div>
    );
  }

  const advance = () => {
    if (!current?.valid(plan)) return;
    if (flow.isLast) {
      timer.complete();
      setStarted(true);
    } else {
      flow.next();
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Migrate a database</h2>
        <p className="mt-1 text-ink-muted">Copy a database into a cluster with no data loss.</p>
      </header>

      <Adapted dimension="flowLayout" className="ps-4">
        {stepped ? (
          <div>
            <ol className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Progress">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  aria-current={i === flow.step ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    i === flow.step ? "font-bold" : "text-ink-muted",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full border text-xs",
                      i < flow.step
                        ? "border-ink bg-ink text-paper"
                        : i === flow.step
                          ? "border-2 border-ink"
                          : "border-line-strong",
                    )}
                  >
                    {i + 1}
                  </span>
                  {s.title}
                </li>
              ))}
            </ol>
            <section aria-labelledby="step-title" className="mt-6 max-w-2xl">
              <h3 id="step-title" className="text-lg font-bold">
                Step {flow.step + 1} of {STEPS.length}: {current?.title}
              </h3>
              <div className="mt-2">
                <Instructions hint={current?.hint ?? ""} steps={current?.steps ?? []} />
              </div>
              <div className="mt-4">
                <StepFields index={flow.step} plan={plan} set={set} />
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={flow.isFirst}
                  onClick={flow.back}
                  className="rounded-md border border-ink px-4 py-2 font-semibold hover:bg-sunken disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!current?.valid(plan)}
                  onClick={advance}
                  className="rounded-md bg-ink px-4 py-2 font-semibold text-paper hover:opacity-90 disabled:opacity-40"
                >
                  {flow.isLast ? "Start migration" : "Continue"}
                </button>
              </div>
            </section>
          </div>
        ) : (
          <ol className="space-y-4">
            {STEPS.map((s, i) => {
              const done = i < flow.step;
              const active = i === flow.step;
              return (
                <li
                  key={s.title}
                  className={cn(
                    "rounded-lg border p-5",
                    active ? "border-ink bg-surface" : "border-line",
                    i > flow.step && "opacity-60",
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-bold">
                      {i + 1}. {s.title}
                    </h3>
                    {done && (
                      <button
                        type="button"
                        className="text-sm font-semibold underline underline-offset-4"
                        onClick={() => flow.goTo(i)}
                      >
                        Change
                      </button>
                    )}
                  </div>
                  {done && <p className="mt-1 text-ink-muted">{s.summary(plan)}</p>}
                  {active && (
                    <div className="mt-3 space-y-4">
                      <Instructions hint={s.hint} steps={s.steps} />
                      <StepFields index={i} plan={plan} set={set} />
                      <button
                        type="button"
                        disabled={!s.valid(plan)}
                        onClick={advance}
                        className="rounded-md bg-ink px-4 py-2 font-semibold text-paper hover:opacity-90 disabled:opacity-40"
                      >
                        {flow.isLast ? "Start migration" : "Continue"}
                      </button>
                    </div>
                  )}
                  {i > flow.step && <p className="mt-1 text-sm text-ink-muted">{s.hint}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </Adapted>
    </div>
  );
}
