# ADR-0003: Asymmetric hysteresis for interface changes

**Status:** Accepted
**Date:** 2026-11-21
**Deciders:** Jose Alejandro Varela Reyes

## Context

Signals decay continuously, so a signal near a rule's threshold crosses it back and forth. Applied
directly, the interface would flicker between versions: the opposite of helpful, and a real
accessibility problem for anyone who relies on a stable layout.

## Decision

Put a **stabilizer** between the resolved target profile and what is shown:

- Changes towards **more support** (simpler wording, more help) apply immediately, limited by a
  4-second per-dimension cooldown.
- Changes towards **less support** apply only after the new target has held for 20 seconds.
- A **stricter confirmation** for an irreversible action is never delayed.
- The level of an open confirmation dialog is locked when it opens.
- Pinned settings bypass the stabilizer: a person's choice applies at once.

## Options Considered

### Option A: No stabilization

**Pros:** simplest. **Cons:** visible flicker near thresholds.

### Option B: Symmetric debounce

**Pros:** stable. **Cons:** delays help exactly when it is needed.

### Option C: Asymmetric hysteresis (chosen)

**Pros:** help arrives at once; it leaves only when it is clearly no longer needed.
**Cons:** one more component and a few seconds of "pending" state to explain.

## Trade-off Analysis

Arriving late costs the person more than staying a little longer, so the two directions are
treated differently. The inspector shows pending changes with a countdown, so the delay is visible
rather than mysterious.

## Consequences

- Easier: tuning rule thresholds without worrying about flicker.
- Harder: tests must advance a clock to observe relaxations (the engine takes an injected clock).
- Revisit: per-dimension timings if some dimensions prove more disruptive than others.

## Action Items

1. [x] `createStabilizer` with oscillation, cooldown and safety tests.
2. [x] Pending changes exposed in the engine snapshot and shown in the inspector.
