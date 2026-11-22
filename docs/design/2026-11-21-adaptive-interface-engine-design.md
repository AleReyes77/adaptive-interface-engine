# Adaptive Interface Engine — Design

**Date:** 2026-11-21 · **Status:** Approved

## Intent

Most interfaces look the same to everyone. A first-time user sees exactly what a five-year
veteran sees, which creates friction, confusion and mistakes. The Adaptive Interface Engine
adapts an interface to *how a person is interacting with it right now*: it simplifies an
explanation after repeated confusion, removes instructions for someone who is moving fast,
offers contextual help after repeated form errors, adapts navigation for keyboard users,
splits a hard process into steps, and changes how an irreversible action is confirmed.

It is a portfolio-grade reference project: a framework-agnostic engine, React bindings, and a
Next.js demo console that makes every adaptation visible and explainable.

## Goals

- A deterministic, testable engine: events → signals → rules → adaptation profile.
- Every adaptation is explainable ("why did this change?") and reversible by the user.
- Privacy by design: local-only, consent per category, retention limits, export and delete.
- A demo that lets a reviewer *see* the engine work in under a minute.

## Non-goals

- No server-side analytics, no third-party tracking, no user accounts.
- Not a general A/B-testing or personalization platform.

## Anti-goals (failure even if it "works")

- Inferring diagnoses, disabilities, age, health or any personal trait. Signals describe
  *interactions*, never *people*.
- A UI that flickers or rearranges itself unpredictably.
- Adaptations the user cannot see, understand or turn off.
- Sending interaction data or user-entered values anywhere.

## Approach

Three approaches were considered:

1. **Heuristics inside components** — each component watches its own behavior. Fast to build,
   but logic is scattered, untestable as a whole and impossible to explain.
2. **ML model inferring a user type** — opaque, needs data, and drifts towards classifying
   people, which violates the anti-goals.
3. **Declarative rules engine over derived signals** *(chosen)* — a closed vocabulary of
   interaction signals feeds JSON-serializable rules that output a closed vocabulary of UI
   dimensions. Deterministic, explainable, testable, and auditable for privacy.

## Architecture

npm workspaces monorepo (matching the conventions of my other projects):

- `packages/engine` — pure TypeScript, zero UI dependencies.
  - **Events**: typed taxonomy (task, field error/correction, help, back-navigation, input
    modality, step timing, irreversible action). Payloads are allow-listed and sanitized; they
    never contain user-entered values.
  - **Store**: bounded ring buffer with retention TTL; drops events whose consent category is off.
  - **Signals**: pure functions with exponential time decay, each returning
    `{ value, confidence, reasons }` (confusion, fluency, form friction, modality, flow struggle,
    risk caution, experience).
  - **Rules**: JSON-serializable condition trees (`all`/`any`/`not`/comparisons on signals),
    validated with zod. A guard rejects rules that reference personal traits or diagnoses.
  - **Resolver**: per-dimension conflict resolution by priority, then specificity; full trace.
  - **Stabilizer**: hysteresis — escalate support quickly, relax slowly, cooldown per dimension,
    so the UI never flaps.
  - **Profile dimensions**: `explanationLevel`, `instructions`, `contextualHelp`, `navigation`,
    `flowLayout`, `confirmation`.
  - **Engine**: `track`, `getSnapshot`, `subscribe` (useSyncExternalStore-compatible),
    consent, user overrides (locks), pause, export, forget. Injected clock for tests.
  - **Explanations**: `ExplanationProvider` interface; static authored content by default.
- `packages/react` — `AdaptiveProvider`, hooks, adaptive primitives (explanation, field help,
  stepped flow, irreversible-action confirmation, keyboard hints, "why" badge), modality
  detection, localStorage persistence. SSR renders defaults.
- `apps/web` — Next.js App Router + Tailwind demo: landing, an operations console with four
  scenarios (concept explanation, deployment form, migration wizard, danger zone), an engine
  inspector (signals, rule trace, overrides, event log, behavior simulation) and a privacy
  center. Optional `/api/explain` route uses Claude when `ANTHROPIC_API_KEY` is set; it only
  ever receives a topic id and level, never user data.

## Quality

- Vitest for the engine (test-first) and React bindings (Testing Library, jsdom).
- Playwright end-to-end tests for the key adaptation flows.
- Biome for lint/format, strict TypeScript, an architecture test that forbids UI imports in
  the engine.
- GitHub Actions CI: lint, typecheck, unit tests with coverage, build, e2e.
- Docs: README, architecture, privacy model, rule authoring guide, ADRs.

## Decisions left to the builder

Exact signal weights and half-lives, visual design of the console, and the content of the
demo scenarios (fictional infrastructure, no real brands).
