import {
  CONSENT_CATEGORIES,
  type ConsentState,
  DEFAULT_CONSENT,
  DIMENSION_KEYS,
  isDimensionValue,
  type ProfilePatch,
} from "@aie/engine";

/**
 * What survives a page reload. Only choices the person made are stored, plus the lifetime task
 * counter when they explicitly asked to be remembered. Raw interaction events are never stored.
 */
export interface PersistedState {
  readonly consent: ConsentState;
  /** Whether the person has answered the consent prompt at all. */
  readonly decided: boolean;
  readonly overrides: ProfilePatch;
  readonly completedTasksTotal: number;
}

export const STORAGE_KEY = "aie:v1";

export const DEFAULT_PERSISTED: PersistedState = Object.freeze({
  consent: DEFAULT_CONSENT,
  decided: false,
  overrides: {},
  completedTasksTotal: 0,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseConsent(value: unknown): ConsentState {
  if (!isRecord(value)) return DEFAULT_CONSENT;
  const consent: Record<string, boolean> = { ...DEFAULT_CONSENT };
  for (const key of [...CONSENT_CATEGORIES, "remember"] as const) {
    if (typeof value[key] === "boolean") consent[key] = value[key];
  }
  return consent as unknown as ConsentState;
}

function parseOverrides(value: unknown): ProfilePatch {
  if (!isRecord(value)) return {};
  const overrides: Record<string, string> = {};
  for (const dimension of DIMENSION_KEYS) {
    const candidate = value[dimension];
    if (isDimensionValue(dimension, candidate)) overrides[dimension] = candidate;
  }
  return overrides;
}

/** Reads stored choices. Missing, blocked or corrupted storage yields the defaults, never an error. */
export function loadPersisted(storage: Storage | null | undefined): PersistedState {
  if (!storage) return DEFAULT_PERSISTED;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERSISTED;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return DEFAULT_PERSISTED;
    const consent = parseConsent(data.consent);
    const count = data.completedTasksTotal;
    return {
      consent,
      decided: data.decided === true,
      overrides: parseOverrides(data.overrides),
      completedTasksTotal:
        consent.remember && typeof count === "number" && Number.isFinite(count) && count > 0
          ? Math.floor(count)
          : 0,
    };
  } catch {
    return DEFAULT_PERSISTED;
  }
}

export function savePersisted(storage: Storage | null | undefined, state: PersistedState): void {
  if (!storage) return;
  const record: PersistedState = {
    ...state,
    completedTasksTotal: state.consent.remember ? state.completedTasksTotal : 0,
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage full or blocked: adaptation keeps working for this session only.
  }
}

export function clearPersisted(storage: Storage | null | undefined): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

/** `window.localStorage`, or null when unavailable (server, sandboxed iframe, blocked cookies). */
export function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
