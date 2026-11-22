import type { ConsentCategory, Dimension, SignalKey } from "@aie/engine";

/** Names people understand, for things the engine calls by their internal names. */
export const DIMENSION_LABELS: Record<Dimension, string> = {
  explanationLevel: "Explanations",
  instructions: "Instructions",
  contextualHelp: "Field help",
  navigation: "Navigation",
  flowLayout: "Process layout",
  confirmation: "Risky actions",
};

export const VALUE_LABELS: Record<Dimension, Record<string, string>> = {
  explanationLevel: { expert: "Condensed", standard: "Standard", simplified: "Plain language" },
  instructions: { minimal: "Hidden", standard: "Short hint", detailed: "Step by step" },
  contextualHelp: { onRequest: "When asked", onError: "After an error", proactive: "Always shown" },
  navigation: { pointer: "Pointer", keyboard: "Keyboard shortcuts" },
  flowLayout: { single: "All at once", stepped: "One step at a time" },
  confirmation: {
    standard: "Simple confirm",
    elevated: "Confirm consequences",
    strict: "Type the name",
  },
};

export const SIGNAL_LABELS: Record<SignalKey, { label: string; hint: string }> = {
  confusion: { label: "Confusion", hint: "Help requests, going back, long pauses" },
  fluency: { label: "Pace", hint: "Fast completions without errors" },
  formFriction: { label: "Form friction", hint: "Rejected fields, minus corrections" },
  keyboardReliance: { label: "Keyboard use", hint: "Share of keyboard navigation" },
  flowStruggle: { label: "Back-and-forth", hint: "Going back and slow steps in a process" },
  riskCaution: { label: "Caution", hint: "Backing out of risky actions" },
  experience: { label: "Familiarity", hint: "Tasks completed in this workspace" },
};

export const CONSENT_LABELS: Record<ConsentCategory, { label: string; description: string }> = {
  interaction: {
    label: "Help and navigation",
    description:
      "When you open help, expand an explanation, go back, or back out of a risky action.",
  },
  forms: {
    label: "Form errors",
    description: "Which field was rejected and why (a code like “range”). Never what you typed.",
  },
  timing: {
    label: "Timing",
    description: "How long steps and tasks take, and long pauses.",
  },
  modality: {
    label: "Input type",
    description: "Whether you are using a keyboard, mouse or touch. Never which keys.",
  },
};

export function valueLabel(dimension: Dimension, value: string): string {
  return VALUE_LABELS[dimension][value] ?? value;
}
