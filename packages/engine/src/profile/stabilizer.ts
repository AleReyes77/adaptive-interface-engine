import {
  type AdaptationProfile,
  DEFAULT_PROFILE,
  DIMENSION_KEYS,
  type Dimension,
  supportRank,
} from "./dimensions";

export interface StabilizerOptions {
  /** A change towards less support must hold this long before it is applied. */
  readonly relaxAfterMs?: number;
  /** Minimum time between two changes of the same dimension. */
  readonly cooldownMs?: number;
  readonly initial?: AdaptationProfile;
}

export interface PendingChange {
  readonly value: string;
  readonly since: number;
}

export type PendingChanges = { readonly [D in Dimension]?: PendingChange };

export interface Stabilizer {
  /** Moves the visible profile towards `target`, respecting hysteresis. */
  next(target: AdaptationProfile, now: number): AdaptationProfile;
  /** Changes that are wanted but not applied yet, and since when. */
  pending(): PendingChanges;
  reset(): void;
}

export const DEFAULT_RELAX_AFTER_MS = 20_000;
export const DEFAULT_COOLDOWN_MS = 4_000;

/**
 * Hysteresis for the adaptation profile, so the interface never flickers.
 *
 * - Towards more support (simpler explanations, more help): applied at once, so help arrives
 *   when it is needed. Limited by a per-dimension cooldown.
 * - Towards less support: applied only after the new target has held for `relaxAfterMs`.
 * - A stricter confirmation is never delayed: safety beats stability.
 */
export function createStabilizer(options: StabilizerOptions = {}): Stabilizer {
  const relaxAfterMs = options.relaxAfterMs ?? DEFAULT_RELAX_AFTER_MS;
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const initial = options.initial ?? DEFAULT_PROFILE;

  let current = initial;
  let lastChangeAt: Partial<Record<Dimension, number>> = {};
  let pending: PendingChanges = {};

  return {
    next(target, now) {
      let changed: Record<string, string> | null = null;
      const stillPending: Record<string, PendingChange> = {};

      for (const dimension of DIMENSION_KEYS) {
        const have = current[dimension];
        const want = target[dimension];
        if (want === have) continue;

        const sinceLastChange = now - (lastChangeAt[dimension] ?? Number.NEGATIVE_INFINITY);
        const previous = pending[dimension];
        const heldSince = previous?.value === want ? previous.since : now;
        const escalation = supportRank(dimension, want) > supportRank(dimension, have);

        const ready = escalation
          ? dimension === "confirmation" || sinceLastChange >= cooldownMs
          : now - heldSince >= relaxAfterMs && sinceLastChange >= cooldownMs;

        if (ready) {
          changed ??= { ...current };
          changed[dimension] = want;
          lastChangeAt[dimension] = now;
        } else {
          stillPending[dimension] = { value: want, since: heldSince };
        }
      }

      pending = stillPending;
      if (changed) current = changed as unknown as AdaptationProfile;
      return current;
    },
    pending: () => pending,
    reset() {
      current = initial;
      lastChangeAt = {};
      pending = {};
    },
  };
}
