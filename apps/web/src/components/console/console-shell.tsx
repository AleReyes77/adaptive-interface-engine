"use client";

import { useDimension } from "@aie/react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Kbd } from "@/components/adaptive/kbd";
import { Inspector } from "@/components/inspector/inspector";
import { cn } from "@/lib/cn";
import { ConceptScenario } from "./concept-scenario";
import { DangerScenario } from "./danger-scenario";
import { DeployScenario } from "./deploy-scenario";
import { MigrateScenario } from "./migrate-scenario";

const SCENARIOS = [
  { id: "concept", label: "Understand", Component: ConceptScenario },
  { id: "deploy", label: "Deploy", Component: DeployScenario },
  { id: "migrate", label: "Migrate", Component: MigrateScenario },
  { id: "danger", label: "Danger zone", Component: DangerScenario },
] as const;

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export function ConsoleShell() {
  const [active, setActive] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const navigation = useDimension("navigation");
  const id = useId();

  // Shortcuts: 1–4 switch scenarios, "i" toggles the inspector. Single-key shortcuts are active
  // only once the interface adapted to the keyboard (WCAG 2.1.4); pinning navigation to
  // "pointer" in the inspector turns them off.
  useEffect(() => {
    if (navigation !== "keyboard") return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector("dialog[open]")) return;
      const n = Number(event.key);
      if (n >= 1 && n <= SCENARIOS.length) {
        setActive(n - 1);
        tabs.current[n - 1]?.focus();
      } else if (event.key === "i") {
        setInspectorOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigation]);

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0 && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? SCENARIOS.length - 1
          : (active + delta + SCENARIOS.length) % SCENARIOS.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const scenario = SCENARIOS[active] ?? SCENARIOS[0];
  const Scenario = scenario.Component;

  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-40 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Scenarios"
          className="flex flex-wrap gap-1 rounded-lg bg-sunken p-1"
        >
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${s.id}`}
              aria-selected={i === active}
              aria-controls={`${id}-panel`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={onTabKey}
              className={cn(
                "rounded-md px-3.5 py-1.5 font-semibold",
                i === active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
              )}
            >
              {s.label}
              <Kbd keys={String(i + 1)} label={`open ${s.label}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-expanded={inspectorOpen}
          aria-controls={`${id}-inspector`}
          onClick={() => setInspectorOpen(!inspectorOpen)}
          className="rounded-md border border-line-strong px-3.5 py-1.5 font-semibold hover:border-ink"
        >
          {inspectorOpen ? "Hide inspector" : "Show inspector"}
          <Kbd keys="i" label="toggle the inspector" />
        </button>
      </div>

      {navigation === "keyboard" && (
        <p className="mt-3 text-sm text-ink-muted">
          Keyboard shortcuts are on: press 1 to 4 to switch scenarios, arrow keys to move between
          tabs, and i to toggle the inspector.
        </p>
      )}

      <div className={cn("mt-6 grid gap-8", inspectorOpen && "lg:grid-cols-[minmax(0,1fr)_23rem]")}>
        <div
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${scenario.id}`}
          className="min-w-0 rounded-xl border border-line bg-surface px-6 py-7 sm:px-8"
        >
          <Scenario key={scenario.id} />
        </div>
        {inspectorOpen && (
          <aside
            id={`${id}-inspector`}
            aria-label="Engine inspector"
            className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto"
          >
            <Inspector />
          </aside>
        )}
      </div>
    </main>
  );
}
