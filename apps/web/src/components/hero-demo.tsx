"use client";

import type { Rule } from "@aie/engine";
import {
  AdaptiveProvider,
  useAdaptiveEngine,
  useDecision,
  useDimension,
  useEngineSnapshot,
  useTrack,
} from "@aie/react";
import { useRef, useState } from "react";
import { TOPIC_TITLES, TOPICS } from "@/content/topics";
import { cn } from "@/lib/cn";
import { valueLabel } from "@/lib/labels";

/** Lower thresholds than the console, so two clicks are enough to see the engine respond. */
const HERO_RULES: Rule[] = [
  {
    id: "simplify-after-confusion",
    description: "You said it wasn't clear, so the explanation switched to plain language.",
    priority: 50,
    when: { signal: "confusion", op: "gte", value: 0.4, minConfidence: 0.5 },
    adapt: { explanationLevel: "simplified" },
  },
  {
    id: "condense-for-fluent",
    description: "You're moving through topics quickly, so the explanation is condensed.",
    priority: 40,
    when: {
      all: [
        { signal: "fluency", op: "gte", value: 0.4, minConfidence: 0.5 },
        { signal: "confusion", op: "lt", value: 0.3 },
      ],
    },
    adapt: { explanationLevel: "expert" },
  },
];

const SEQUENCE = ["replication", "failover", "backups"] as const;

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-engine transition-[width] duration-500"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </span>
      <span className="text-end tabular-nums">{Math.round(value * 100)}%</span>
    </div>
  );
}

function Demo() {
  const level = useDimension("explanationLevel");
  const decision = useDecision("explanationLevel");
  const { signals } = useEngineSnapshot();
  const engine = useAdaptiveEngine();
  const track = useTrack();
  const [index, setIndex] = useState(0);
  const shownAt = useRef(Date.now());
  const topic = SEQUENCE[index % SEQUENCE.length] ?? "replication";
  const adapted = decision.source === "rule";

  return (
    <div className="rounded-xl border border-line bg-surface p-6 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">{TOPIC_TITLES[topic]}</h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-sm",
            adapted ? "bg-engine-soft text-engine" : "bg-sunken text-ink-muted",
          )}
        >
          {valueLabel("explanationLevel", level)}
        </span>
      </div>

      <div className={cn("mt-4 min-h-[9.5rem] ps-4", adapted && "adapted")}>
        <p
          key={`${topic}-${level}`}
          className="adapt-swap text-lg leading-relaxed"
          aria-live="polite"
        >
          {TOPICS[topic][level]}
        </p>
      </div>
      <p className="mt-3 min-h-12 ps-4 text-sm text-engine">{adapted ? decision.reason : ""}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => track({ type: "help.opened", topicId: topic })}
          className="rounded-md border border-ink px-4 py-2 font-semibold hover:bg-sunken"
        >
          This isn't clear
        </button>
        <button
          type="button"
          onClick={() => {
            track({
              type: "task.completed",
              taskId: "read-topic",
              durationMs: Date.now() - shownAt.current,
            });
            shownAt.current = Date.now();
            setIndex(index + 1);
          }}
          className="rounded-md bg-ink px-4 py-2 font-semibold text-paper hover:opacity-90"
        >
          Got it, next topic
        </button>
        <button
          type="button"
          onClick={() => {
            engine.forget();
            setIndex(0);
          }}
          className="ms-auto px-1 text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          Reset
        </button>
      </div>

      <div className="mt-6 space-y-2 border-t border-line pt-5">
        <Meter label="Confusion" value={signals.confusion.value} />
        <Meter label="Pace" value={signals.fluency.value} />
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        This box runs its own engine. It only sees these buttons, and forgets everything when you
        leave the page.
      </p>
    </div>
  );
}

export function HeroDemo() {
  return (
    <AdaptiveProvider
      storage={null}
      trackModality={false}
      tickMs={1_000}
      options={{
        rules: HERO_RULES,
        consent: { interaction: true, timing: true },
        signals: { halfLifeMs: 45_000 },
        stability: { relaxAfterMs: 0, cooldownMs: 0 },
      }}
    >
      <Demo />
    </AdaptiveProvider>
  );
}
