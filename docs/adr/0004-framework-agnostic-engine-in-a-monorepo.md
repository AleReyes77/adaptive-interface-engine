# ADR-0004: A framework-agnostic engine in an npm workspaces monorepo

**Status:** Accepted
**Date:** 2026-11-21
**Deciders:** Jose Alejandro Varela Reyes

## Context

The engine's logic (signals, rules, stabilization) has nothing to do with React. Keeping it pure
makes it testable without a DOM and reusable from other frameworks, but only if the boundary is
enforced rather than hoped for.

## Decision

Three workspaces:

- `@aie/engine`: pure TypeScript, depends only on zod.
- `@aie/react`: provider, hooks and headless behaviors; depends on the engine and React.
- `@aie/web`: the Next.js demo; presentation only.

The boundary is enforced three ways: package dependencies, a Biome `noRestrictedImports` rule on
`packages/engine/src`, and an architecture test that fails if engine code imports a UI framework or
touches browser globals.

## Options Considered

### Option A: One Next.js app with folders

| Dimension            | Assessment      |
| -------------------- | --------------- |
| Complexity           | Low             |
| Boundary enforcement | Convention only |
| Reuse                | Copy-paste      |

### Option B: Workspaces with packages shipping TypeScript source (chosen)

| Dimension            | Assessment                         |
| -------------------- | ---------------------------------- |
| Complexity           | Medium                             |
| Boundary enforcement | Dependencies, lint rule and a test |
| Reuse                | Import the package                 |

### Option C: Separately published packages with a build step

| Dimension            | Assessment                            |
| -------------------- | ------------------------------------- |
| Complexity           | High (builds, versioning, publishing) |
| Boundary enforcement | Strong                                |
| Reuse                | Strong                                |

## Trade-off Analysis

Option B gets the enforcement of C without a build pipeline: packages export their TypeScript
source and Next.js transpiles them (`transpilePackages`). Publishing to npm can be added later
without changing the code layout.

## Consequences

- Easier: testing the engine in isolation, swapping the UI layer.
- Harder: one more level of directory structure.
- Revisit: add a build and `exports` for publishing if the engine is used outside this repo.
