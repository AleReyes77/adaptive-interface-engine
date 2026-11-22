import type { ConsentCategory } from "../events/taxonomy";

/**
 * What a person allowed the engine to observe.
 *
 * Each category can be granted on its own. `remember` controls whether choices and the
 * lifetime task counter survive a page reload; raw events are never persisted.
 */
export interface ConsentState {
  readonly interaction: boolean;
  readonly forms: boolean;
  readonly timing: boolean;
  readonly modality: boolean;
  readonly remember: boolean;
}

/** Privacy by default: nothing is observed until the person opts in. */
export const DEFAULT_CONSENT: ConsentState = Object.freeze({
  interaction: false,
  forms: false,
  timing: false,
  modality: false,
  remember: false,
});

export function isCategoryAllowed(consent: ConsentState, category: ConsentCategory): boolean {
  return consent[category];
}

/** True when at least one observation category is granted. */
export function hasAnyConsent(consent: ConsentState): boolean {
  return consent.interaction || consent.forms || consent.timing || consent.modality;
}
