import type { InteractionEvent } from "@aie/engine";

export type SimulationId = "confused" | "fluent" | "formErrors" | "keyboard" | "riskHesitation";

export interface Simulation {
  readonly label: string;
  readonly description: string;
  /** The synthetic events to feed the engine. They go through consent like any other event. */
  events(): InteractionEvent[];
}

function repeat<T>(n: number, make: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => make(i));
}

/**
 * Scripted behavior, so a reviewer can watch the engine react without having to act it out.
 * Each script produces exactly the events a real session would.
 */
export const SIMULATIONS: Readonly<Record<SimulationId, Simulation>> = {
  confused: {
    label: "Get lost",
    description: "Opens help twice, expands an explanation and goes back a step.",
    events: () => [
      { type: "help.opened", topicId: "replication" },
      { type: "explanation.expanded", topicId: "replication" },
      { type: "help.opened", topicId: "failover" },
      { type: "navigation.back", flowId: "migration", step: 1 },
    ],
  },
  fluent: {
    label: "Move fast",
    description:
      "Completes four steps in a few seconds each and finishes a task in under a minute.",
    events: () => [
      ...repeat(4, (i) => ({
        type: "step.completed" as const,
        flowId: "migration",
        step: i,
        durationMs: 3_000 + i * 500,
      })),
      { type: "task.completed", taskId: "deploy", durationMs: 40_000 },
    ],
  },
  formErrors: {
    label: "Fight the form",
    description: "Submits three values the deploy form rejects.",
    events: () => [
      { type: "field.error", formId: "deploy", fieldId: "replicas", code: "range" },
      { type: "field.error", formId: "deploy", fieldId: "memory", code: "step" },
      { type: "field.error", formId: "deploy", fieldId: "image", code: "latest" },
    ],
  },
  keyboard: {
    label: "Use the keyboard",
    description: "Navigates with the keyboard six times in a row.",
    events: () => repeat(6, () => ({ type: "input.modality" as const, modality: "keyboard" })),
  },
  riskHesitation: {
    label: "Hesitate",
    description: "Opens the decommission dialog twice and backs out both times.",
    events: () =>
      repeat(2, () => [
        { type: "irreversible.requested" as const, actionId: "decommission-cluster" },
        { type: "irreversible.cancelled" as const, actionId: "decommission-cluster" },
      ]).flat(),
  },
};
