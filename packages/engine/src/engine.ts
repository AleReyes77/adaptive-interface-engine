import { createEventStore, type EventStoreOptions } from "./events/store";
import {
  CONSENT_CATEGORIES,
  EVENT_CATEGORY,
  sanitizeEvent,
  type TrackedEvent,
} from "./events/taxonomy";
import {
  type ConsentState,
  DEFAULT_CONSENT,
  hasAnyConsent,
  isCategoryAllowed,
} from "./privacy/consent";
import {
  type AdaptationProfile,
  DIMENSION_KEYS,
  type Dimension,
  type DimensionValue,
  isDimensionValue,
  type ProfilePatch,
} from "./profile/dimensions";
import {
  DEFAULT_REASON,
  type DecisionMap,
  type DimensionDecision,
  overrideDecision,
  resolveProfile,
} from "./profile/resolve";
import {
  createStabilizer,
  type PendingChanges,
  type StabilizerOptions,
} from "./profile/stabilizer";
import { DEFAULT_RULES } from "./rules/defaults";
import { validateRules } from "./rules/schema";
import type { Rule } from "./rules/types";
import {
  computeSignals,
  SIGNAL_KEYS,
  type SignalConfig,
  type SignalSnapshot,
} from "./signals/compute";

export interface EngineOptions {
  /** Rule set to use. Validated on creation; an invalid set throws. Defaults to `DEFAULT_RULES`. */
  readonly rules?: readonly Rule[];
  /** Time source in milliseconds. Injected for deterministic tests. */
  readonly clock?: () => number;
  readonly consent?: Partial<ConsentState>;
  /** Dimensions the person pinned. Invalid entries are ignored. */
  readonly overrides?: ProfilePatch;
  /** Lifetime task counter restored from storage (only when the person chose to be remembered). */
  readonly completedTasksTotal?: number;
  readonly store?: EventStoreOptions;
  readonly signals?: Partial<SignalConfig>;
  readonly stability?: Omit<StabilizerOptions, "initial">;
}

/** An immutable view of everything the engine knows and decided. */
export interface EngineSnapshot {
  readonly profile: AdaptationProfile;
  readonly decisions: DecisionMap;
  readonly signals: SignalSnapshot;
  readonly consent: ConsentState;
  readonly overrides: ProfilePatch;
  readonly paused: boolean;
  readonly events: readonly TrackedEvent[];
  readonly matchedRuleIds: readonly string[];
  readonly pending: PendingChanges;
  readonly completedTasksTotal: number;
  readonly rules: readonly Rule[];
  /** Increases every time the snapshot changes. */
  readonly revision: number;
}

/** Everything the engine holds, in a portable format (the "download my data" feature). */
export interface EngineExport {
  readonly format: "adaptive-interface-engine/v1";
  readonly exportedAt: string;
  readonly consent: ConsentState;
  readonly overrides: ProfilePatch;
  readonly paused: boolean;
  readonly completedTasksTotal: number;
  readonly profile: AdaptationProfile;
  readonly decisions: DecisionMap;
  readonly events: readonly TrackedEvent[];
}

export interface AdaptiveEngine {
  /** Records an interaction event. Returns false when it was rejected, not consented or paused. */
  track(event: unknown): boolean;
  /** Re-evaluates time-dependent state (signal decay, pending relaxations). */
  tick(): void;
  getSnapshot(): EngineSnapshot;
  /** Subscribes to snapshot changes. Compatible with React's `useSyncExternalStore`. */
  subscribe(listener: () => void): () => void;
  setConsent(consent: Partial<ConsentState>): void;
  setOverride<D extends Dimension>(dimension: D, value: DimensionValue<D> | null): void;
  clearOverrides(): void;
  setPaused(paused: boolean): void;
  /** Deletes every observed event, the task counter and all adaptation state. Keeps choices. */
  forget(): void;
  exportData(): EngineExport;
}

export const PAUSED_REASON = "Adaptation is paused, so everyone sees the standard interface.";
export const NO_CONSENT_REASON = "Adaptation is off until you choose what the engine may observe.";

type MutableSnapshot = Omit<EngineSnapshot, "revision">;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A cheap structural fingerprint, so subscribers are only notified about meaningful changes. */
function fingerprint(s: MutableSnapshot): string {
  return JSON.stringify([
    s.profile,
    DIMENSION_KEYS.map((d) => [
      s.decisions[d].source,
      s.decisions[d].ruleId,
      s.decisions[d].outranked,
    ]),
    SIGNAL_KEYS.map((k) => [
      round(s.signals[k].value),
      round(s.signals[k].confidence),
      s.signals[k].reasons,
    ]),
    s.events.length,
    s.events.at(-1)?.at,
    s.pending,
    s.consent,
    s.overrides,
    s.paused,
    s.completedTasksTotal,
    s.matchedRuleIds,
  ]);
}

function cleanOverrides(overrides: ProfilePatch): ProfilePatch {
  const clean: Record<string, string> = {};
  for (const dimension of DIMENSION_KEYS) {
    const value = overrides[dimension];
    if (isDimensionValue(dimension, value)) clean[dimension] = value;
  }
  return clean;
}

function cleanConsent(partial: Partial<ConsentState>): Partial<ConsentState> {
  const clean: Record<string, boolean> = {};
  for (const key of [...CONSENT_CATEGORIES, "remember"] as const) {
    if (typeof partial[key] === "boolean") clean[key] = partial[key];
  }
  return clean;
}

/**
 * Creates an adaptive interface engine.
 *
 * Pipeline on every change: events (consented, sanitized, bounded) → signals (decaying) →
 * rules (resolved per dimension) → stabilizer (hysteresis) → person's overrides → snapshot.
 */
export function createAdaptiveEngine(options: EngineOptions = {}): AdaptiveEngine {
  const validation = validateRules(options.rules ?? DEFAULT_RULES);
  if (!validation.ok) {
    throw new Error(`Invalid rule set:\n- ${validation.errors.join("\n- ")}`);
  }
  const rules: readonly Rule[] = Object.freeze(validation.rules);
  const clock = options.clock ?? Date.now;
  const store = createEventStore(options.store);
  const stabilizer = createStabilizer(options.stability);
  const listeners = new Set<() => void>();

  let consent: ConsentState = { ...DEFAULT_CONSENT, ...cleanConsent(options.consent ?? {}) };
  let overrides = cleanOverrides(options.overrides ?? {});
  let paused = false;
  let completedTasksTotal = Math.max(0, Math.floor(Number(options.completedTasksTotal) || 0));
  /** The decision that produced each currently visible value, kept while a change is pending. */
  let lastApplied: Partial<Record<Dimension, DimensionDecision>> = {};
  let revision = 0;

  /** Signals for the events still inside the retention window. */
  function measure(now: number) {
    const events = store.list(now);
    // The task counter only grows from timing events, so it is evidence only with timing consent.
    const signals = computeSignals(
      events,
      now,
      { completedTasksTotal, experienceKnown: consent.timing },
      options.signals,
    );
    return { events, signals };
  }

  function compute(): MutableSnapshot {
    const now = clock();
    const { events, signals } = measure(now);
    const base = { signals, consent, overrides, paused, events, completedTasksTotal, rules };

    if (paused || !hasAnyConsent(consent)) {
      const inactive = resolveProfile([], signals, overrides);
      const reason = paused ? PAUSED_REASON : NO_CONSENT_REASON;
      const decisions = {} as Record<Dimension, DimensionDecision>;
      for (const d of DIMENSION_KEYS) {
        const decision = inactive.decisions[d];
        decisions[d] = decision.source === "default" ? { ...decision, reason } : decision;
      }
      return { ...base, profile: inactive.profile, decisions, matchedRuleIds: [], pending: {} };
    }

    const target = resolveProfile(rules, signals);
    const stable = stabilizer.next(target.profile, now);
    const profile: Record<string, string> = {};
    const decisions = {} as Record<Dimension, DimensionDecision>;
    const pending: Record<string, unknown> = { ...stabilizer.pending() };

    for (const d of DIMENSION_KEYS) {
      const targetDecision = target.decisions[d];
      let decision: DimensionDecision;
      if (stable[d] === target.profile[d]) {
        decision = targetDecision;
        lastApplied[d] = decision;
      } else {
        decision = lastApplied[d] ?? {
          dimension: d,
          value: stable[d],
          source: "default",
          reason: DEFAULT_REASON,
          outranked: [],
        };
      }

      const override = overrides[d];
      if (override !== undefined) {
        const contenders = [targetDecision.ruleId, ...targetDecision.outranked];
        decision = overrideDecision(
          d,
          override,
          contenders.filter((id): id is string => id !== undefined),
        );
        delete pending[d];
      }

      decisions[d] = decision;
      profile[d] = decision.value;
    }

    return {
      ...base,
      profile: profile as unknown as AdaptationProfile,
      decisions,
      matchedRuleIds: target.matchedRuleIds,
      pending: pending as PendingChanges,
    };
  }

  let current = compute();
  let print = fingerprint(current);
  let snapshot: EngineSnapshot = { ...current, revision };

  function refresh(force = false) {
    current = compute();
    const nextPrint = fingerprint(current);
    if (!force && nextPrint === print) return;
    print = nextPrint;
    revision += 1;
    snapshot = { ...current, revision };
    for (const listener of [...listeners]) listener();
  }

  /**
   * Restarts adaptation from what the remaining data supports right now, in both directions:
   * anything derived from deleted data disappears at once, and anything that still holds stays.
   */
  function resetAdaptation() {
    const now = clock();
    const target = resolveProfile(rules, measure(now).signals);
    stabilizer.reset(target.profile);
    lastApplied = { ...target.decisions };
  }

  return {
    track(input) {
      if (paused) return false;
      const event = sanitizeEvent(input);
      if (!event || !isCategoryAllowed(consent, EVENT_CATEGORY[event.type])) return false;
      store.add({ ...event, at: clock() });
      if (event.type === "task.completed") completedTasksTotal += 1;
      refresh(true);
      return true;
    },

    tick() {
      refresh();
    },

    getSnapshot() {
      return snapshot;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setConsent(partial) {
      const next: ConsentState = { ...consent, ...cleanConsent(partial) };
      const revoked = CONSENT_CATEGORIES.filter((c) => consent[c] && !next[c]);
      consent = next;
      if (revoked.length > 0) {
        // Privacy beats stability: data from a revoked category, and anything derived from it,
        // disappears immediately instead of fading out.
        store.purge((event) => revoked.includes(EVENT_CATEGORY[event.type]));
        if (revoked.includes("timing")) completedTasksTotal = 0;
        resetAdaptation();
      }
      refresh();
    },

    setOverride(dimension, value) {
      if (value !== null && !isDimensionValue(dimension, value)) {
        throw new TypeError(`"${String(value)}" is not a valid value for ${dimension}`);
      }
      const next: Record<string, string> = { ...overrides };
      if (value === null) delete next[dimension];
      else next[dimension] = value;
      overrides = next;
      refresh();
    },

    clearOverrides() {
      overrides = {};
      refresh();
    },

    setPaused(value) {
      paused = value;
      refresh();
    },

    forget() {
      store.clear();
      completedTasksTotal = 0;
      resetAdaptation();
      refresh(true);
    },

    exportData() {
      return {
        format: "adaptive-interface-engine/v1",
        exportedAt: new Date(clock()).toISOString(),
        consent,
        overrides,
        paused,
        completedTasksTotal,
        profile: snapshot.profile,
        decisions: snapshot.decisions,
        events: store.list(clock()),
      };
    },
  };
}
