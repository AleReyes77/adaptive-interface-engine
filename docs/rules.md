# Writing rules

A rule says: _when these interaction signals look like this, change these parts of the
interface, and here is the sentence that explains why._

```ts
import type { Rule } from "@aie/engine";

const assistAfterFormErrors: Rule = {
  id: "assist-after-form-errors",
  description:
    "A few fields were rejected, so help is now shown next to each field before you submit.",
  priority: 60,
  when: { signal: "formFriction", op: "gte", value: 0.5 },
  adapt: { contextualHelp: "proactive" },
};
```

## Fields

| Field         | Rules                                                                              |
| ------------- | ---------------------------------------------------------------------------------- |
| `id`          | Lowercase kebab case, 2–64 characters, unique in the set                           |
| `description` | 10–240 characters. Shown to the person. Describe the interaction, never the person |
| `priority`    | Integer 0–100. Higher wins when rules disagree on a dimension                      |
| `when`        | A condition tree (below)                                                           |
| `adapt`       | One or more dimensions with a valid value                                          |

## Conditions

```ts
type Condition =
  | { signal: SignalKey; op: "gt" | "gte" | "lt" | "lte"; value: number; minConfidence?: number }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };
```

`value` and `minConfidence` are between 0 and 1. Use `minConfidence` when a single event should not
be enough, for example `keyboardReliance` after one key press.

## Signals

`confusion`, `fluency`, `formFriction`, `keyboardReliance`, `flowStruggle`, `riskCaution`,
`experience`. See [architecture.md](architecture.md#signals) for the evidence behind each.

## Dimensions

| Dimension          | Values, from least to most support  |
| ------------------ | ----------------------------------- |
| `explanationLevel` | `expert`, `standard`, `simplified`  |
| `instructions`     | `minimal`, `standard`, `detailed`   |
| `contextualHelp`   | `onRequest`, `onError`, `proactive` |
| `navigation`       | `pointer`, `keyboard`               |
| `flowLayout`       | `single`, `stepped`                 |
| `confirmation`     | `standard`, `elevated`, `strict`    |

## Conflicts

When several matching rules set the same dimension, the winner is the highest `priority`, then the
most specific condition (more comparisons), then the alphabetically first `id`. Losing rules are
listed in the decision, so the inspector can show them.

## Loading rules from JSON

```ts
import { createAdaptiveEngine, validateRules } from "@aie/engine";

const result = validateRules(await fetch("/rules.json").then((r) => r.json()));
if (!result.ok) throw new Error(result.errors.join("\n"));
const engine = createAdaptiveEngine({ rules: result.rules });
```

`createAdaptiveEngine` validates again and throws on an invalid set, so a bad rule file fails loudly
at startup instead of misbehaving at runtime.

## What gets rejected

- Unknown signals or dimensions, or values outside a dimension's list.
- A rule that changes nothing.
- Duplicate ids.
- Text that talks about people rather than interactions, for example
  `"Simplifies the UI for users with dyslexia"`. Describe what happened instead:
  `"You asked for help several times, so explanations are simpler."`
