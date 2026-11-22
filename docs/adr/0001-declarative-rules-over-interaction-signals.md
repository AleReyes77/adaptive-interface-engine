# ADR-0001: Declarative rules over interaction signals

**Status:** Accepted
**Date:** 2026-11-21
**Deciders:** Jose Alejandro Varela Reyes

## Context

The engine must change an interface in response to how it is being used: simplify after
confusion, step aside for fast users, help after form errors. Every change must be explainable
to the person it affects, reversible, and auditable for privacy. It must never turn into a model
of _who the person is_.

## Decision

Derive a closed set of numeric **signals** from interaction events, and map them to a closed set
of **interface dimensions** with **declarative, JSON-serializable rules**. Each rule carries the
user-facing sentence that explains it. Rules are validated with zod before they run.

## Options Considered

### Option A: Heuristics inside each component

| Dimension            | Assessment                                |
| -------------------- | ----------------------------------------- |
| Complexity           | Low at first, high as components multiply |
| Explainability       | Poor: logic is scattered                  |
| Testability          | Per component only                        |
| Privacy auditability | Poor: every component is a potential leak |

**Pros:** fast to start, no new concepts.
**Cons:** no single place to explain or audit a decision; components disagree with each other.

### Option B: A machine-learning model that classifies the user

| Dimension            | Assessment                                   |
| -------------------- | -------------------------------------------- |
| Complexity           | High (data, training, drift)                 |
| Explainability       | Low                                          |
| Testability          | Statistical only                             |
| Privacy auditability | Poor: the model _is_ a profile of the person |

**Pros:** can find patterns nobody wrote down.
**Cons:** opaque, needs data collection, and drifts towards labeling people, which is exactly
what this project refuses to do.

### Option C: Declarative rules over derived signals (chosen)

| Dimension            | Assessment                                       |
| -------------------- | ------------------------------------------------ |
| Complexity           | Medium                                           |
| Explainability       | High: every decision names its rule and sentence |
| Testability          | High: pure functions with an injected clock      |
| Privacy auditability | High: closed vocabularies in and out             |

**Pros:** deterministic, explainable, testable, rules can ship as data.
**Cons:** someone has to write and tune the rules.

## Trade-off Analysis

The project values explainability and privacy over discovering patterns automatically. Rules
cost some authoring effort, but they make "why did this change?" a lookup instead of a guess,
and the closed vocabularies make it structurally impossible to store a conclusion about a person.

## Consequences

- Easier: explaining decisions, testing them, loading rule sets from configuration.
- Harder: covering subtle patterns that no rule describes.
- Revisit: per-rule tuning from aggregate, consented feedback if the engine is used in production.

## Action Items

1. [x] Closed signal and dimension vocabularies (`packages/engine/src/signals`, `profile`).
2. [x] zod schema plus a personal-inference guard (`packages/engine/src/rules`).
3. [x] Conflict resolution by priority, then specificity, then id.
