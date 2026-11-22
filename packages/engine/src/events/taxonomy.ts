import { z } from "zod";

/**
 * The interaction event taxonomy.
 *
 * Events describe what happened in the interface, never who the person is or what they typed.
 * Every payload field is either a short machine identifier, a small number or an enum, so a
 * value entered by the user (an email, a name, a password) cannot be smuggled into an event.
 */

/** Groups of events a person can consent to independently. */
export type ConsentCategory = "interaction" | "forms" | "timing" | "modality";

export const CONSENT_CATEGORIES: readonly ConsentCategory[] = [
  "interaction",
  "forms",
  "timing",
  "modality",
];

export type Modality = "pointer" | "keyboard" | "touch";

/** Upper bound for any duration carried by an event (one hour). */
export const MAX_DURATION_MS = 3_600_000;

/**
 * Identifiers are lowercase machine names such as `deploy-form` or `replicas`.
 * Uppercase letters, spaces and `@` are rejected, which keeps names and emails out.
 */
const id = z.string().regex(/^[a-z][a-z0-9._-]{0,63}$/);

const duration = z
  .number()
  .refine(Number.isFinite)
  .transform((ms) => Math.min(MAX_DURATION_MS, Math.max(0, Math.round(ms))));

const step = z.number().int().min(0).max(100);

const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("help.opened"), topicId: id }),
  z.object({ type: z.literal("explanation.expanded"), topicId: id }),
  z.object({ type: z.literal("navigation.back"), flowId: id, step }),
  z.object({ type: z.literal("task.started"), taskId: id }),
  z.object({ type: z.literal("task.completed"), taskId: id, durationMs: duration }),
  z.object({ type: z.literal("field.error"), formId: id, fieldId: id, code: id }),
  z.object({ type: z.literal("field.corrected"), formId: id, fieldId: id }),
  z.object({ type: z.literal("form.submitted"), formId: id, success: z.boolean() }),
  z.object({ type: z.literal("step.completed"), flowId: id, step, durationMs: duration }),
  z.object({
    type: z.literal("input.modality"),
    modality: z.enum(["pointer", "keyboard", "touch"]),
  }),
  z.object({ type: z.literal("hesitation"), context: id, durationMs: duration }),
  z.object({ type: z.literal("irreversible.requested"), actionId: id }),
  z.object({ type: z.literal("irreversible.cancelled"), actionId: id }),
  z.object({ type: z.literal("irreversible.confirmed"), actionId: id }),
]);

/** An interaction event as emitted by the interface. */
export type InteractionEvent = z.output<typeof eventSchema>;

export type InteractionEventType = InteractionEvent["type"];

/** An event after the engine accepted it, stamped with the time it was recorded. */
export type TrackedEvent = InteractionEvent & { readonly at: number };

/** The consent category each event type belongs to. */
export const EVENT_CATEGORY: Readonly<Record<InteractionEventType, ConsentCategory>> = {
  "help.opened": "interaction",
  "explanation.expanded": "interaction",
  "navigation.back": "interaction",
  "task.started": "timing",
  "task.completed": "timing",
  "field.error": "forms",
  "field.corrected": "forms",
  "form.submitted": "forms",
  "step.completed": "timing",
  "input.modality": "modality",
  hesitation: "timing",
  "irreversible.requested": "interaction",
  "irreversible.cancelled": "interaction",
  "irreversible.confirmed": "interaction",
};

/**
 * Validates untrusted input against the taxonomy.
 * Unknown keys are dropped, durations are clamped, and anything malformed returns `null`.
 */
export function sanitizeEvent(input: unknown): InteractionEvent | null {
  const parsed = eventSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
