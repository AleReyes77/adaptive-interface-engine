import type { Rule } from "./types";

/**
 * The built-in rule set. Each rule maps an interaction pattern to an interface change and
 * explains it in words the person will see.
 */
export const DEFAULT_RULES: readonly Rule[] = [
  {
    id: "simplify-after-confusion",
    description:
      "You asked for help several times, so explanations are simpler and instructions more detailed.",
    priority: 50,
    when: { signal: "confusion", op: "gte", value: 0.55, minConfidence: 0.5 },
    adapt: { explanationLevel: "simplified", instructions: "detailed" },
  },
  {
    id: "condense-for-fluent",
    description:
      "You are completing steps quickly, so explanations are condensed and routine instructions are hidden.",
    priority: 40,
    when: {
      all: [
        { signal: "fluency", op: "gte", value: 0.6, minConfidence: 0.6 },
        { signal: "confusion", op: "lt", value: 0.3 },
      ],
    },
    adapt: { explanationLevel: "expert", instructions: "minimal" },
  },
  {
    id: "assist-after-form-errors",
    description:
      "A few fields were rejected, so help is now shown next to each field before you submit.",
    priority: 60,
    when: { signal: "formFriction", op: "gte", value: 0.5 },
    adapt: { contextualHelp: "proactive" },
  },
  {
    id: "keyboard-navigation",
    description: "You mostly use the keyboard, so shortcuts and focus indicators are shown.",
    priority: 50,
    when: { signal: "keyboardReliance", op: "gte", value: 0.7, minConfidence: 0.6 },
    adapt: { navigation: "keyboard" },
  },
  {
    id: "step-through-hard-process",
    description:
      "This process caused some back-and-forth, so it is now split into one step at a time.",
    priority: 50,
    when: {
      any: [
        { signal: "flowStruggle", op: "gte", value: 0.5 },
        {
          all: [
            { signal: "confusion", op: "gte", value: 0.5 },
            { signal: "experience", op: "lt", value: 0.4 },
          ],
        },
      ],
    },
    adapt: { flowLayout: "stepped" },
  },
  {
    id: "guard-autopilot",
    description:
      "You are moving fast, so irreversible actions ask you to type the resource name to prevent autopilot mistakes.",
    priority: 70,
    when: { signal: "fluency", op: "gte", value: 0.6, minConfidence: 0.6 },
    adapt: { confirmation: "strict" },
  },
  {
    id: "clarify-risk-when-uncertain",
    description:
      "There was some back-and-forth recently, so confirmations now spell out exactly what will happen.",
    priority: 60,
    when: {
      any: [
        { signal: "confusion", op: "gte", value: 0.5 },
        { signal: "riskCaution", op: "gte", value: 0.5 },
      ],
    },
    adapt: { confirmation: "elevated" },
  },
  {
    id: "newcomer-guidance",
    description:
      "This is one of your first tasks in this workspace, so instructions are more detailed.",
    priority: 10,
    when: { signal: "experience", op: "lt", value: 0.2 },
    adapt: { instructions: "detailed" },
  },
];
