"use client";

import {
  DEFAULT_RELAX_AFTER_MS,
  DIMENSION_KEYS,
  DIMENSIONS,
  type Dimension,
  describeCondition,
  hasAnyConsent,
  SIGNAL_KEYS,
  type TrackedEvent,
} from "@aie/engine";
import { useAdaptiveEngine, useConsent, useEngineSnapshot } from "@aie/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { DIMENSION_LABELS, SIGNAL_LABELS, valueLabel } from "@/lib/labels";
import { SIMULATIONS, type SimulationId } from "@/lib/simulations";

const ALLOW_ALL = { interaction: true, forms: true, timing: true, modality: true };

function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-5">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SourceTag({ source }: { source: "default" | "rule" | "override" }) {
  const label = { default: "Default", rule: "Adapted", override: "Pinned by you" }[source];
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold",
        source === "rule" && "bg-engine-soft text-engine",
        source === "override" && "bg-ink text-paper",
        source === "default" && "bg-sunken text-ink-muted",
      )}
    >
      {label}
    </span>
  );
}

function ProfileSection() {
  const engine = useAdaptiveEngine();
  const { decisions, overrides, pending } = useEngineSnapshot();
  const now = useNow();

  return (
    <ul className="space-y-4">
      {DIMENSION_KEYS.map((dimension: Dimension) => {
        const decision = decisions[dimension];
        const wait = pending[dimension];
        const seconds = wait
          ? Math.max(0, Math.ceil((wait.since + DEFAULT_RELAX_AFTER_MS - now) / 1_000))
          : 0;
        const selectId = `override-${dimension}`;
        return (
          <li key={dimension}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={selectId} className="font-semibold">
                {DIMENSION_LABELS[dimension]}
              </label>
              <SourceTag source={decision.source} />
            </div>
            <select
              id={selectId}
              value={overrides[dimension] ?? ""}
              onChange={(e) =>
                engine.setOverride(
                  dimension,
                  e.target.value === "" ? null : (e.target.value as never),
                )
              }
              className="mt-1.5 w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5"
            >
              <option value="">
                Automatic (now {valueLabel(dimension, decision.value).toLowerCase()})
              </option>
              {DIMENSIONS[dimension].map((value) => (
                <option key={value} value={value}>
                  Pin: {valueLabel(dimension, value)}
                </option>
              ))}
            </select>
            {decision.source !== "default" && (
              <p className="mt-1.5 text-sm text-ink-muted">{decision.reason}</p>
            )}
            {wait && (
              <p className="mt-1 text-sm text-engine">
                Easing to {valueLabel(dimension, wait.value).toLowerCase()} in {seconds} s, if the
                pattern holds.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "strong evidence";
  if (confidence >= 0.5) return "some evidence";
  if (confidence > 0) return "little evidence";
  return "no evidence";
}

function SignalsSection() {
  const { signals } = useEngineSnapshot();
  return (
    <ul className="space-y-3.5">
      {SIGNAL_KEYS.map((key) => {
        const signal = signals[key];
        const percent = Math.round(signal.value * 100);
        return (
          <li key={key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold">{SIGNAL_LABELS[key].label}</span>
              <span className="tabular-nums text-ink-muted">
                {percent}%, {confidenceLabel(signal.confidence)}
              </span>
            </div>
            {/* biome-ignore lint/a11y/useSemanticElements: a styled bar whose opacity also encodes confidence; <meter> cannot be styled consistently across browsers. */}
            <div
              role="meter"
              aria-label={SIGNAL_LABELS[key].label}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken"
            >
              <div
                className="h-full rounded-full bg-engine transition-[width] duration-500"
                style={{ width: `${percent}%`, opacity: 0.35 + signal.confidence * 0.65 }}
              />
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {signal.reasons[0] ?? SIGNAL_LABELS[key].hint}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function RulesSection() {
  const { rules, matchedRuleIds, decisions } = useEngineSnapshot();
  const winners = new Set(DIMENSION_KEYS.map((d) => decisions[d].ruleId).filter(Boolean));
  return (
    <ul className="space-y-3">
      {rules.map((rule) => {
        const matched = matchedRuleIds.includes(rule.id);
        const status = winners.has(rule.id) ? "Applied" : matched ? "Outranked" : "Waiting";
        return (
          <li
            key={rule.id}
            className={cn(
              "rounded-md border px-3 py-2.5",
              matched ? "border-engine/50 bg-engine-soft/60" : "border-line",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm">{rule.id}</span>
              <span
                className={cn("text-xs font-semibold", matched ? "text-engine" : "text-ink-muted")}
              >
                {status}, priority {rule.priority}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-ink-muted">
              when {describeCondition(rule.when)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function SimulateSection({ disabled }: { disabled: boolean }) {
  const engine = useAdaptiveEngine();
  return (
    <div>
      <p className="text-sm text-ink-muted">
        Feed the engine a scripted pattern instead of acting it out. These events go through consent
        like real ones.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(Object.keys(SIMULATIONS) as SimulationId[]).map((id) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            title={SIMULATIONS[id].description}
            onClick={() => {
              for (const event of SIMULATIONS[id].events()) engine.track(event);
            }}
            className="rounded-md border border-line-strong px-3 py-2 text-start text-sm font-semibold hover:border-ink disabled:opacity-40"
          >
            {SIMULATIONS[id].label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => engine.forget()}
        className="mt-3 text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
      >
        Forget what it observed
      </button>
    </div>
  );
}

function describeEvent(event: TrackedEvent): string {
  const { at: _at, type: _type, ...payload } = event;
  return Object.entries(payload)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" ");
}

function EventLog() {
  const { events } = useEngineSnapshot();
  const now = useNow(5_000);
  const recent = events.slice(-12).reverse();
  if (recent.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Nothing observed yet. Use the console or a simulation.
      </p>
    );
  }
  return (
    <ol className="space-y-1.5 font-mono text-xs">
      {recent.map((event) => (
        <li key={`${event.at}-${event.type}-${describeEvent(event)}`} className="flex gap-3">
          <span className="w-10 shrink-0 text-end text-ink-muted tabular-nums">
            {Math.max(0, Math.round((now - event.at) / 1_000))}s
          </span>
          <span>
            <span className="font-semibold">{event.type}</span>{" "}
            <span className="text-ink-muted">{describeEvent(event)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Inspector() {
  const engine = useAdaptiveEngine();
  const { consent, paused, events } = useEngineSnapshot();
  const { decide } = useConsent();
  const active = hasAnyConsent(consent);

  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-lg font-bold">Engine inspector</h2>
        {active && (
          <button
            type="button"
            onClick={() => engine.setPaused(!paused)}
            className="rounded-md border border-line-strong px-3 py-1 text-sm font-semibold hover:border-ink"
          >
            {paused ? "Resume adapting" : "Pause adapting"}
          </button>
        )}
      </div>

      {!active && (
        <div className="border-t border-line px-5 py-4">
          <p>Adaptation is off, so the console looks the same for everyone.</p>
          <button
            type="button"
            onClick={() => decide(ALLOW_ALL)}
            className="mt-3 rounded-md bg-ink px-4 py-2 font-semibold text-paper hover:opacity-90"
          >
            Allow on this device
          </button>
        </div>
      )}

      <Section title="Interface right now">
        <ProfileSection />
      </Section>
      <Section title="Simulate behavior">
        <SimulateSection disabled={!active || paused} />
      </Section>
      <Section title="Signals">
        <SignalsSection />
      </Section>
      <Section title="Rules">
        <RulesSection />
      </Section>
      <Section title={`Observed events (${events.length})`}>
        <EventLog />
      </Section>
    </div>
  );
}
