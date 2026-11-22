# Privacy model

The engine adapts an interface to _interaction_, never to _identity_. This page lists what it
handles, where that data lives, and how each guarantee is enforced in code and tests.

## Data inventory

| Data                  | Example                                           | Where it lives                       | How long                 | Leaves the device?                |
| --------------------- | ------------------------------------------------- | ------------------------------------ | ------------------------ | --------------------------------- |
| Interaction events    | `field.error deploy.replicas code=range`          | Tab memory                           | 20 minutes, at most 500  | Never                             |
| Derived signals       | `confusion = 0.64`                                | Tab memory                           | Recomputed, never stored | Never                             |
| Consent choices       | `{ forms: true, ... }`                            | `localStorage` key `aie:v1`          | Until deleted            | Never                             |
| Pinned settings       | `{ navigation: "keyboard" }`                      | `localStorage` key `aie:v1`          | Until deleted            | Never                             |
| Task counter          | `7`                                               | `localStorage`, only with `remember` | Until deleted            | Never                             |
| AI request (optional) | `{ topicId: "replication", level: "simplified" }` | Server route                         | Not stored               | To the model provider, if enabled |

Nothing in this table identifies a person, and nothing records what they typed.

## Guarantees and their enforcement

| Guarantee                                  | Enforced by                                                                             | Tested in                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------- |
| Nothing is observed before consent         | `DEFAULT_CONSENT` is all false; `track()` drops events from ungranted categories        | `engine.test.ts`                  |
| Typed values can't enter an event          | Allow-listed zod schemas; ids must match `^[a-z][a-z0-9._-]{0,63}$`                     | `taxonomy.test.ts`                |
| Data ages out                              | Ring buffer capacity and retention window                                               | `store.test.ts`                   |
| Revoking consent deletes derived data      | Purge by category and stabilizer reset on revoke                                        | `engine.test.ts`                  |
| No inference about the person              | Closed signal and dimension vocabularies; personal-inference guard on rule text (EN/ES) | `rules.test.ts`, `engine.test.ts` |
| Server rendering is identical for everyone | `SERVER_SNAPSHOT` during SSR and hydration                                              | `provider.test.tsx`               |
| Broken storage never breaks the page       | Every read and write wrapped; invalid entries dropped                                   | `persistence.test.ts`             |
| A person can see, export and erase         | Privacy center, `exportData()`, `eraseAll()`                                            | `adaptation.spec.ts`              |

## What the guard rejects

Rules are data, so a future contributor could write one that targets a group of people. The guard
rejects rule ids and descriptions that mention diagnoses, disabilities, health, age, gender,
ethnicity, religion, pregnancy, mood or personality, in English and Spanish, accents ignored.
It is a second line of defense: even a rule that passed it could only read interaction signals and
write interface dimensions.

## Known limits

- In-memory data is visible to code running in the same page, like any other page state.
- The guard is a vocabulary check, not semantic understanding; review rule sets like code.
- If the optional AI route is enabled, the model provider receives the authored text of a topic.
