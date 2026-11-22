# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through
[GitHub security advisories](https://github.com/AleReyes77/adaptive-interface-engine/security/advisories/new)
instead of opening a public issue. I aim to acknowledge reports within a few days.

## Scope

Of particular interest:

- Any way to get user-entered values, names or emails into an interaction event.
- Any way for interaction data to leave the browser.
- Any way to make `/api/explain` send arbitrary text to the model.
- Rules that infer personal traits while passing validation.

See [docs/privacy.md](docs/privacy.md) for the guarantees and how they are enforced.
