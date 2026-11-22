# Contributing

Thanks for your interest. This is a portfolio project, but issues and pull requests are welcome.

## Setup

```bash
nvm use          # Node 24 (see .nvmrc)
npm install
npm run dev      # http://localhost:3000
```

## Before opening a pull request

```bash
npm run lint
npm run typecheck
npm test
npm run build && npm run test:e2e
```

## Conventions

- **Tests first.** Engine and React changes start with a failing test.
- **Boundaries.** `packages/engine` must not import React, Next.js or browser globals; the
  architecture test enforces it.
- **Rules describe interactions, never people.** The rule guard rejects text about diagnoses,
  disabilities, age or other personal traits. Please don't work around it.
- **Copy.** Sentence case, plain verbs, and buttons that say what they do.
- **Commits.** [Conventional Commits](https://www.conventionalcommits.org): `feat(engine): ...`,
  `fix(react): ...`, `docs: ...`.
