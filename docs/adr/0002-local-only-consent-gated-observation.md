# ADR-0002: Local-only, consent-gated observation

**Status:** Accepted
**Date:** 2026-11-21
**Deciders:** Jose Alejandro Varela Reyes

## Context

Adapting to behavior means observing behavior. Observation is where adaptive interfaces usually
become surveillance: event streams sent to a server, retained indefinitely, joined with identity.

## Decision

Observation happens **only in the browser tab**, **only for categories the person granted**, and
**only for a bounded time**:

- Four consent categories (`interaction`, `forms`, `timing`, `modality`), all off by default.
- Events are sanitized against an allow-listed schema; identifiers must be lowercase machine names,
  so names, emails and typed values cannot be carried.
- A ring buffer of at most 500 events with a 20-minute retention window, in memory only.
- Only choices are persisted (consent, pinned settings) and, with explicit opt-in, a task counter.
- Revoking a category purges its events and every adaptation derived from them immediately.

## Options Considered

### Option A: Server-side analytics pipeline

| Dimension    | Assessment                                |
| ------------ | ----------------------------------------- |
| Complexity   | High (ingestion, storage, retention jobs) |
| Privacy      | Poor by default                           |
| Cross-device | Yes                                       |

**Pros:** cross-device adaptation, aggregate tuning.
**Cons:** creates a behavioral dataset about people; needs a legal basis, retention policy, breach
response. Contradicts the project's purpose.

### Option B: Local-only with consent per category (chosen)

| Dimension    | Assessment                     |
| ------------ | ------------------------------ |
| Complexity   | Low                            |
| Privacy      | Strong: nothing leaves the tab |
| Cross-device | No                             |

**Pros:** no data controller burden, instant deletion, easy to explain.
**Cons:** adaptation restarts on a new device or after 20 minutes of inactivity.

## Trade-off Analysis

Losing cross-device continuity is a small price. Adaptation is about the current session's
friction, which is exactly what a 20-minute window captures.

## Consequences

- Easier: honest privacy copy, "download my data" and "delete everything" are trivial.
- Harder: learning from many users to improve rules (would need a separate, opt-in study).
- Revisit: if a product needs cross-device continuity, sync _choices_, never events.

## Action Items

1. [x] Event sanitizer and identifier rule (`events/taxonomy.ts`).
2. [x] Bounded store with retention (`events/store.ts`).
3. [x] Purge-on-revoke and stabilizer reset (`engine.ts`).
4. [x] Privacy center with export and delete (`apps/web/src/app/privacy`).
