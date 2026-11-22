import { z } from "zod";
import { DIMENSION_KEYS, DIMENSIONS } from "../profile/dimensions";
import { SIGNAL_KEYS } from "../signals/compute";
import { findPersonalInference } from "./guard";
import type { Condition, Rule } from "./types";

const unit = z.number().min(0).max(1);

const comparisonSchema = z.strictObject({
  signal: z.enum(SIGNAL_KEYS),
  op: z.enum(["gt", "gte", "lt", "lte"]),
  value: unit,
  minConfidence: unit.optional(),
});

const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    comparisonSchema,
    z.strictObject({ all: z.array(conditionSchema).min(1) }),
    z.strictObject({ any: z.array(conditionSchema).min(1) }),
    z.strictObject({ not: conditionSchema }),
  ]),
);

const patchSchema = z
  .strictObject({
    explanationLevel: z.enum(DIMENSIONS.explanationLevel).optional(),
    instructions: z.enum(DIMENSIONS.instructions).optional(),
    contextualHelp: z.enum(DIMENSIONS.contextualHelp).optional(),
    navigation: z.enum(DIMENSIONS.navigation).optional(),
    flowLayout: z.enum(DIMENSIONS.flowLayout).optional(),
    confirmation: z.enum(DIMENSIONS.confirmation).optional(),
  })
  .refine((patch) => DIMENSION_KEYS.some((key) => patch[key] !== undefined), {
    message: "A rule must change at least one dimension",
  });

const ruleSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,63}$/, "Use a lowercase kebab-case id"),
  description: z.string().min(10).max(240),
  priority: z.number().int().min(0).max(100),
  when: conditionSchema,
  adapt: patchSchema,
});

export type RuleValidation =
  | { readonly ok: true; readonly rules: Rule[] }
  | { readonly ok: false; readonly errors: string[] };

/**
 * Validates an untrusted rule set (for example, loaded from JSON).
 * Checks the shape, the closed vocabularies, unique ids and the personal-inference guard.
 */
export function validateRules(input: unknown): RuleValidation {
  const parsed = z.array(ruleSchema).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "rules"}: ${issue.message}`,
      ),
    };
  }

  const errors: string[] = [];
  const seen = new Set<string>();
  parsed.data.forEach((rule, index) => {
    if (seen.has(rule.id)) errors.push(`${index} (${rule.id}): duplicate rule id`);
    seen.add(rule.id);
    const terms = findPersonalInference(rule);
    if (terms.length > 0) {
      errors.push(
        `${index} (${rule.id}): rules must describe interactions, not people (found: ${terms.join(", ")})`,
      );
    }
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, rules: parsed.data };
}
