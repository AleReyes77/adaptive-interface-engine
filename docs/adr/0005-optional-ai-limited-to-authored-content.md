# ADR-0005: Optional AI, limited to rewording authored content

**Status:** Accepted
**Date:** 2026-11-21
**Deciders:** Jose Alejandro Varela Reyes

## Context

A language model can reword an explanation at a different level of detail on demand. It could
also, if fed behavioral data, start describing or judging the person, which the project forbids.

## Decision

AI is **optional** and **narrow**:

- The engine decides the level; the model only rewords text people wrote for that topic.
- The API route accepts exactly `{ topicId, level }`, both from closed lists, validated with zod.
  The prompt is assembled on the server from authored content, so no user data or free text can
  reach the model.
- Without credentials the route answers 501 and the interface keeps the authored text.
- Results are cached per topic and level; a per-client rate limit protects cost.
- The model is `claude-opus-5-5` at low effort, with server-side fallbacks enabled for refusals.

## Options Considered

### Option A: No AI

**Pros:** simplest, fully deterministic. **Cons:** one wording per level.

### Option B: AI generates explanations from the session context

**Pros:** highly tailored. **Cons:** requires sending behavior to a third party; outputs cannot be
reviewed in advance. Rejected.

### Option C: AI rewords authored content on request (chosen)

**Pros:** variety on demand, facts stay those the team wrote, no personal data involved.
**Cons:** depends on an external service when enabled.

## Consequences

- Easier: offering "word it differently" without writing more copy.
- Harder: nothing for the default build: the feature is off without a key.
- Revisit: an evaluation set for factual faithfulness before enabling it for real users.
