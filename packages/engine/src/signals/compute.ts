import type { TrackedEvent } from "../events/taxonomy";
import { clamp01, decayWeight, saturate } from "./decay";

/**
 * Signals are the engine's closed vocabulary for describing *interaction*.
 * None of them describes a person: "confusion" means "this interface is producing confusion
 * right now", not "this person is confused in general".
 */
export const SIGNAL_KEYS = [
  "confusion",
  "fluency",
  "formFriction",
  "keyboardReliance",
  "flowStruggle",
  "riskCaution",
  "experience",
] as const;

export type SignalKey = (typeof SIGNAL_KEYS)[number];

export interface Signal {
  /** Strength of the signal, in [0, 1]. */
  readonly value: number;
  /** How much evidence backs the value, in [0, 1]. Rules can require a minimum. */
  readonly confidence: number;
  /** Plain-language evidence, shown to the person when they ask "why?". */
  readonly reasons: readonly string[];
}

export type SignalSnapshot = Readonly<Record<SignalKey, Signal>>;

export interface SignalConfig {
  /** Evidence loses half its weight after this long. */
  readonly halfLifeMs: number;
  /** A step that takes longer than this counts as struggle. */
  readonly slowStepMs: number;
  /** A step completed faster than this counts as fluency. */
  readonly fastStepMs: number;
  /** A task completed faster than this counts as fluency. */
  readonly fastTaskMs: number;
  /** A pause longer than this counts as hesitation. */
  readonly longHesitationMs: number;
}

export const DEFAULT_SIGNAL_CONFIG: SignalConfig = Object.freeze({
  halfLifeMs: 5 * 60_000,
  slowStepMs: 45_000,
  fastStepMs: 15_000,
  fastTaskMs: 60_000,
  longHesitationMs: 8_000,
});

export interface SignalContext {
  /** Tasks completed across sessions. Only available when the person chose to be remembered. */
  readonly completedTasksTotal: number;
  /**
   * Whether the counter is real evidence. It only grows from timing events, so without timing
   * consent familiarity is unknown and the experience signal reports zero confidence.
   * Defaults to true.
   */
  readonly experienceKnown?: boolean;
}

/** Decayed evidence plus a raw count, accumulated per kind of observation. */
class Tally {
  weight = 0;
  count = 0;
  add(weight: number) {
    this.weight += weight;
    this.count += 1;
  }
}

function times(n: number): string {
  return n === 1 ? "once" : `${n} times`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function signal(value: number, confidence: number, reasons: string[]): Signal {
  const v = clamp01(value);
  return {
    value: v,
    confidence: v === 0 ? 0 : clamp01(confidence),
    reasons: v === 0 ? [] : reasons,
  };
}

/** Derives every signal from the events still inside the retention window. Pure and deterministic. */
export function computeSignals(
  events: readonly TrackedEvent[],
  now: number,
  context: SignalContext,
  config: Partial<SignalConfig> = {},
): SignalSnapshot {
  const cfg = { ...DEFAULT_SIGNAL_CONFIG, ...config };

  const help = new Tally();
  const expanded = new Tally();
  const back = new Tally();
  const hesitation = new Tally();
  const cancelled = new Tally();
  const requested = new Tally();
  const fastSteps = new Tally();
  const fastTasks = new Tally();
  const completions = new Tally();
  const slowSteps = new Tally();
  const errors = new Tally();
  const corrections = new Tally();
  const keyboard = new Tally();
  const modality = new Tally();
  const errorsByField = new Map<string, number>();

  for (const event of events) {
    const w = decayWeight(now - event.at, cfg.halfLifeMs);
    switch (event.type) {
      case "help.opened":
        help.add(w);
        break;
      case "explanation.expanded":
        expanded.add(w);
        break;
      case "navigation.back":
        back.add(w);
        break;
      case "hesitation":
        if (event.durationMs >= cfg.longHesitationMs) hesitation.add(w);
        break;
      case "irreversible.cancelled":
        cancelled.add(w);
        break;
      case "irreversible.requested":
        requested.add(w);
        break;
      case "step.completed":
        completions.add(w);
        if (event.durationMs <= cfg.fastStepMs) fastSteps.add(w);
        if (event.durationMs >= cfg.slowStepMs) slowSteps.add(w);
        break;
      case "task.completed":
        completions.add(w);
        if (event.durationMs <= cfg.fastTaskMs) fastTasks.add(w);
        break;
      case "field.error": {
        errors.add(w);
        const field = `${event.formId}.${event.fieldId}`;
        errorsByField.set(field, (errorsByField.get(field) ?? 0) + 1);
        break;
      }
      case "field.corrected":
        corrections.add(w);
        break;
      case "input.modality":
        modality.add(w);
        if (event.modality === "keyboard") keyboard.add(w);
        break;
      default:
        break;
    }
  }

  // Confusion: asking for help, expanding explanations, going back, long pauses, backing out.
  const confusionEvidence =
    help.weight +
    0.6 * expanded.weight +
    0.8 * back.weight +
    hesitation.weight +
    0.4 * cancelled.weight;
  const confusionCount =
    help.count + expanded.count + back.count + hesitation.count + cancelled.count;
  const confusionReasons = [
    help.count > 0 && `Opened help ${times(help.count)}`,
    expanded.count > 0 && `Expanded an explanation ${times(expanded.count)}`,
    back.count > 0 && `Went back ${times(back.count)}`,
    hesitation.count > 0 && `Paused for a long time ${times(hesitation.count)}`,
    cancelled.count > 0 && `Backed out of a risky action ${times(cancelled.count)}`,
  ].filter((r): r is string => typeof r === "string");

  // Fluency: fast completions, discounted by the share of errors.
  const errorShare =
    errors.weight + completions.weight > 0
      ? errors.weight / (errors.weight + completions.weight)
      : 0;
  const fluencyValue = saturate(fastSteps.weight + fastTasks.weight, 3) * (1 - errorShare);
  const fluencyReasons = [
    fastSteps.count > 0 && `Completed ${plural(fastSteps.count, "step")} quickly`,
    fastTasks.count > 0 && `Completed ${plural(fastTasks.count, "task")} quickly`,
    errors.count > 0 && `${plural(errors.count, "form error")} lower this`,
  ].filter((r): r is string => typeof r === "string");

  // Form friction: validation errors, partially offset by successful corrections.
  const frictionValue = saturate(Math.max(0, errors.weight - 0.3 * corrections.weight), 3);
  const frictionReasons = [...errorsByField.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([field, n]) => `${plural(n, "error")} in ${field}`);

  // Keyboard reliance: share of recent interactions that came from the keyboard.
  const keyboardValue = modality.weight > 0 ? keyboard.weight / modality.weight : 0;

  // Flow struggle: going back and slow steps inside multi-step processes.
  const struggleValue = saturate(back.weight + slowSteps.weight, 2);
  const struggleReasons = [
    back.count > 0 && `Went back ${times(back.count)}`,
    slowSteps.count > 0 && `${plural(slowSteps.count, "slow step")}`,
  ].filter((r): r is string => typeof r === "string");

  // Risk caution: starting and backing out of irreversible actions.
  const cautionValue = saturate(cancelled.weight + 0.3 * requested.weight, 2);
  const cautionReasons = [
    cancelled.count > 0 && `Backed out of a risky action ${times(cancelled.count)}`,
    requested.count > 0 && `Started a risky action ${times(requested.count)}`,
  ].filter((r): r is string => typeof r === "string");

  const completed = Math.max(0, context.completedTasksTotal);
  const experienceValue = saturate(completed, 5);
  const experience: Signal =
    context.experienceKnown === false
      ? { value: 0, confidence: 0, reasons: [] }
      : {
          value: experienceValue,
          // A known count of zero is still evidence: it is what makes someone new here.
          confidence: 1,
          reasons: completed > 0 ? [`${plural(completed, "task")} completed`] : [],
        };

  return {
    confusion: signal(saturate(confusionEvidence, 3), confusionCount / 3, confusionReasons),
    fluency: signal(fluencyValue, completions.count / 3, fluencyReasons),
    formFriction: signal(frictionValue, errors.count / 2, frictionReasons),
    keyboardReliance: signal(keyboardValue, modality.weight / 5, [
      `${keyboard.count} of ${modality.count} recent interactions used the keyboard`,
    ]),
    flowStruggle: signal(struggleValue, (back.count + slowSteps.count) / 2, struggleReasons),
    riskCaution: signal(cautionValue, (cancelled.count + requested.count) / 2, cautionReasons),
    experience,
  };
}
