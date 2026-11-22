/**
 * The adaptation profile: a closed set of interface dimensions the engine may change.
 *
 * Values are ordered from least to most support. The order matters: the stabilizer applies
 * changes towards more support quickly and changes towards less support slowly.
 */
export const DIMENSIONS = {
  /** How much an explanation assumes the reader already knows. */
  explanationLevel: ["expert", "standard", "simplified"],
  /** How many step-by-step instructions accompany a task. */
  instructions: ["minimal", "standard", "detailed"],
  /** When field-level help is shown in forms. */
  contextualHelp: ["onRequest", "onError", "proactive"],
  /** Whether keyboard affordances (shortcuts, focus emphasis, skip links) are surfaced. */
  navigation: ["pointer", "keyboard"],
  /** Whether a multi-part process is shown at once or one step at a time. */
  flowLayout: ["single", "stepped"],
  /** How much friction an irreversible action's confirmation adds. */
  confirmation: ["standard", "elevated", "strict"],
} as const;

export type Dimension = keyof typeof DIMENSIONS;

export type DimensionValue<D extends Dimension> = (typeof DIMENSIONS)[D][number];

export type AdaptationProfile = { readonly [D in Dimension]: DimensionValue<D> };

/** A partial profile, as produced by a rule or chosen by the person. */
export type ProfilePatch = { readonly [D in Dimension]?: DimensionValue<D> };

export const DIMENSION_KEYS = Object.keys(DIMENSIONS) as readonly Dimension[];

/** What everyone sees before the engine has any evidence. */
export const DEFAULT_PROFILE: AdaptationProfile = Object.freeze({
  explanationLevel: "standard",
  instructions: "standard",
  contextualHelp: "onError",
  navigation: "pointer",
  flowLayout: "single",
  confirmation: "standard",
});

/** Position of a value on its dimension's support scale (0 = least support). */
export function supportRank<D extends Dimension>(dimension: D, value: DimensionValue<D>): number {
  return (DIMENSIONS[dimension] as readonly string[]).indexOf(value);
}

export function isDimensionValue<D extends Dimension>(
  dimension: D,
  value: unknown,
): value is DimensionValue<D> {
  return (DIMENSIONS[dimension] as readonly unknown[]).includes(value);
}
